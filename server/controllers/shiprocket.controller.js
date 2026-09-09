const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const {
  ShiprocketError,
  checkServiceability,
  selectCourier,
  createShipmentOrder,
  assignAWB,
  generatePickup,
  mapShiprocketStatus,
  trackShipment,
} = require("../services/shiprocket.service");

const LOCK_MAX_AGE_MS = 15 * 60 * 1000;

const PICKUP_CONFIRMED_STATUSES = new Set([
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RTO",
]);

class FulfillmentError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "FulfillmentError";
    this.code = options.code || "FULFILLMENT_ERROR";
    this.status = options.status || 400;
    this.stage = options.stage || "eligibility";
    this.actionRequired = options.actionRequired !== false;
  }
}

const isPresent = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const ensureShiprocket = (order) => {
  if (!order.shiprocket) order.shiprocket = {};
  if (!order.shiprocket.pickup) order.shiprocket.pickup = {};
  if (!order.shiprocket.serviceability) order.shiprocket.serviceability = {};
  if (!order.shiprocket.parcel) order.shiprocket.parcel = {};
  return order.shiprocket;
};

const saveOrder = async (order) => {
  order.markModified("shiprocket");
  await order.save();
  return order;
};

const normaliseIndianPhone = (phone) => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new FulfillmentError(
      "A valid 10-digit Indian mobile number is required before shipping.",
      { code: "INVALID_PHONE", stage: "eligibility" }
    );
  }
  return digits;
};

const normalisePincode = (pincode, fieldName) => {
  const value = String(pincode || "").replace(/\s/g, "");
  if (!/^[1-9]\d{5}$/.test(value)) {
    throw new FulfillmentError(
      `${fieldName} must be a valid 6-digit Indian PIN code.`,
      { code: "INVALID_PINCODE", stage: "eligibility" }
    );
  }
  return value;
};

const validatePaymentEligibility = (order) => {
  if (order.paymentMethod === "online") {
    if (
      order.paymentStatus !== "paid" ||
      !isPresent(order.paymentId) ||
      !isPresent(order.razorpayOrderId)
    ) {
      throw new FulfillmentError(
        "Prepaid fulfillment requires a verified Razorpay payment matched to this order. This order is unpaid or its payment verification is incomplete.",
        { code: "PREPAID_PAYMENT_NOT_VERIFIED", stage: "eligibility" }
      );
    }
    return false;
  }

  if (order.paymentMethod === "cod") {
    // Existing COD orders enter the admin queue as awaiting_confirmation. The
    // explicit admin Shiprocket action is the existing intentional approval.
    if (!["awaiting_confirmation", "paid"].includes(order.paymentStatus)) {
      throw new FulfillmentError(
        "COD fulfillment is not eligible in its current payment state.",
        { code: "COD_NOT_ELIGIBLE", stage: "eligibility" }
      );
    }
    return true;
  }

  if (order.paymentMethod === "phone_confirm") {
    if (order.paymentStatus !== "paid") {
      throw new FulfillmentError(
        "Phone-confirmation orders can ship only after staff marks payment as paid.",
        { code: "PHONE_CONFIRM_PAYMENT_NOT_VERIFIED", stage: "eligibility" }
      );
    }
    return false;
  }

  throw new FulfillmentError(
    "This order has an unsupported payment method for Shiprocket fulfillment.",
    { code: "UNSUPPORTED_PAYMENT_METHOD", stage: "eligibility" }
  );
};

const validateBaseOrder = (order) => {
  if (["cancelled", "delivered"].includes(String(order.orderStatus || "").toLowerCase())) {
    throw new FulfillmentError(
      `A ${order.orderStatus} order is not eligible for Shiprocket fulfillment.`,
      { code: "ORDER_NOT_ELIGIBLE_FOR_FULFILLMENT", stage: "eligibility" }
    );
  }

  const address = order.shippingAddress || {};
  const requiredAddressFields = [
    ["first name", address.firstName],
    ["street address", address.address],
    ["city", address.city],
    ["state", address.state],
  ];
  const missing = requiredAddressFields.find(([, value]) => !isPresent(value));
  if (missing) {
    throw new FulfillmentError(
      `Shipping ${missing[0]} is required before fulfillment can start.`,
      { code: "INCOMPLETE_SHIPPING_ADDRESS", stage: "eligibility" }
    );
  }

  const email = String(order.guestEmail || order.user?.email || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new FulfillmentError(
      "A valid customer email is required before fulfillment can start.",
      { code: "INVALID_CUSTOMER_EMAIL", stage: "eligibility" }
    );
  }

  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new FulfillmentError(
      "This order has no shippable products.",
      { code: "ORDER_HAS_NO_ITEMS", stage: "eligibility" }
    );
  }

  const phone = normaliseIndianPhone(order.phone);
  const deliveryPincode = normalisePincode(address.zip, "Delivery PIN code");
  const declaredValue = toPositiveNumber(order.total);
  if (!declaredValue) {
    throw new FulfillmentError(
      "This order has an invalid total and cannot be sent to Shiprocket.",
      { code: "INVALID_ORDER_TOTAL", stage: "eligibility" }
    );
  }
  const cod = validatePaymentEligibility(order);
  return { phone, email, deliveryPincode, declaredValue, cod };
};

const productIdForItem = (item) => String(item?.product?._id || item?.product || "");

const buildParcelAndItems = async (order) => {
  const productIds = [...new Set(order.items.map(productIdForItem).filter(Boolean))];
  if (productIds.length !== order.items.length) {
    throw new FulfillmentError(
      "One or more order items no longer have a product reference. Review the order before shipping.",
      { code: "MISSING_PRODUCT_REFERENCE", stage: "eligibility" }
    );
  }

  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productsById = new Map(products.map((product) => [String(product._id), product]));

  let totalWeightKg = 0;
  let maxLengthCm = 0;
  let maxBreadthCm = 0;
  let stackedHeightCm = 0;
  const orderItems = [];

  for (const item of order.items) {
    const product = productsById.get(productIdForItem(item));
    const quantity = Number(item.quantity);
    const price = toPositiveNumber(item.price);

    if (!product) {
      throw new FulfillmentError(
        `Product “${item.name || "Unknown product"}” no longer exists. Review this order before shipping.`,
        { code: "PRODUCT_NOT_FOUND", stage: "eligibility" }
      );
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new FulfillmentError(
        `Product “${item.name || product.name}” has an invalid quantity.`,
        { code: "INVALID_ITEM_QUANTITY", stage: "eligibility" }
      );
    }
    if (!price) {
      throw new FulfillmentError(
        `Product “${item.name || product.name}” has an invalid saved price.`,
        { code: "INVALID_ITEM_PRICE", stage: "eligibility" }
      );
    }

    const shipping = product.shipping || {};
    const weightKg = toPositiveNumber(shipping.weightKg);
    const lengthCm = toPositiveNumber(shipping.lengthCm);
    const breadthCm = toPositiveNumber(shipping.breadthCm);
    const heightCm = toPositiveNumber(shipping.heightCm);
    if (!weightKg || !lengthCm || !breadthCm || !heightCm) {
      throw new FulfillmentError(
        `Product “${product.name}” is missing shipping weight or parcel dimensions. Add them in Admin Products before retrying.`,
        { code: "MISSING_PRODUCT_PARCEL_DATA", stage: "eligibility" }
      );
    }

    totalWeightKg += weightKg * quantity;
    maxLengthCm = Math.max(maxLengthCm, lengthCm);
    maxBreadthCm = Math.max(maxBreadthCm, breadthCm);
    stackedHeightCm += heightCm * quantity;
    orderItems.push({
      name: item.name || product.name,
      sku: shipping.sku || product.slug || String(product._id),
      units: quantity,
      selling_price: price,
    });
  }

  return {
    parcel: {
      weightKg: Number(totalWeightKg.toFixed(3)),
      lengthCm: Number(maxLengthCm.toFixed(1)),
      breadthCm: Number(maxBreadthCm.toFixed(1)),
      heightCm: Number(stackedHeightCm.toFixed(1)),
    },
    orderItems,
  };
};

const acquireFulfillmentLock = async (orderId) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new FulfillmentError("Invalid order ID.", { code: "INVALID_ORDER_ID", status: 400 });
  }

  const now = new Date();
  const staleBefore = new Date(Date.now() - LOCK_MAX_AGE_MS);
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      $or: [
        { "shiprocket.automationState": { $ne: "IN_PROGRESS" } },
        { "shiprocket.lockAcquiredAt": { $lt: staleBefore } },
      ],
    },
    {
      $set: {
        "shiprocket.automationState": "IN_PROGRESS",
        "shiprocket.lockAcquiredAt": now,
        "shiprocket.lastAttemptAt": now,
        "shiprocket.failureReason": "",
        "shiprocket.lastErrorCode": "",
      },
      $inc: { "shiprocket.attempts": 1 },
    },
    { new: true, runValidators: true }
  );

  if (!order) {
    const existing = await Order.findById(orderId).select("shiprocket.automationState shiprocket.lockAcquiredAt");
    if (!existing) {
      throw new FulfillmentError("Order not found", { code: "ORDER_NOT_FOUND", status: 404 });
    }
    throw new FulfillmentError(
      "This Shiprocket fulfillment request is already processing. Refresh the order shortly.",
      { code: "FULFILLMENT_IN_PROGRESS", status: 409, actionRequired: false }
    );
  }

  await order.populate("user", "email");
  return order;
};

const asDateOrNow = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const markSuccessfulPickup = async (order, pickup) => {
  const shiprocket = ensureShiprocket(order);
  shiprocket.pickup.requestState = "SCHEDULED";
  shiprocket.pickup.status = "SCHEDULED";
  shiprocket.pickup.requestedAt = new Date();
  shiprocket.pickup.scheduledAt = asDateOrNow(pickup.scheduledAt);
  shiprocket.pickup.token = pickup.token || "";
  shiprocket.pickup.message = pickup.message || "Pickup requested successfully";
  shiprocket.status = "PICKUP_SCHEDULED";
  shiprocket.automationState = "COMPLETED";
  shiprocket.failureReason = "";
  shiprocket.lastErrorCode = "";
  shiprocket.lastSuccessAt = new Date();
  shiprocket.lockAcquiredAt = null;
  return saveOrder(order);
};

const requestPickup = async (order) => {
  const shiprocket = ensureShiprocket(order);
  if (!shiprocket.shipmentId) {
    throw new FulfillmentError(
      "An AWB exists without a Shiprocket shipment ID. Reconcile the shipment in Shiprocket before retrying pickup.",
      { code: "SHIPROCKET_AWB_SHIPMENT_ID_MISSING", stage: "pickup", status: 409 }
    );
  }

  if (shiprocket.pickup?.status === "SCHEDULED") {
    shiprocket.pickup.requestState = "SCHEDULED";
    shiprocket.status = "PICKUP_SCHEDULED";
    shiprocket.automationState = "COMPLETED";
    shiprocket.failureReason = "";
    shiprocket.lastErrorCode = "";
    shiprocket.lastSuccessAt = shiprocket.lastSuccessAt || new Date();
    shiprocket.lockAcquiredAt = null;
    return saveOrder(order);
  }

  if (["UNKNOWN", "REQUESTED"].includes(shiprocket.pickup?.requestState)) {
    throw new FulfillmentError(
      "The previous Shiprocket pickup request has an unknown outcome. Reconcile pickup status in Shiprocket before retrying to avoid a duplicate request.",
      { code: "SHIPROCKET_PICKUP_OUTCOME_UNKNOWN", stage: "pickup", status: 409 }
    );
  }

  // Persist the in-flight stage before the outbound request. If the process
  // stops after Shiprocket receives it, a retry will request reconciliation
  // instead of generating a duplicate pickup.
  shiprocket.pickup.requestState = "REQUESTED";
  shiprocket.pickup.status = "REQUESTED";
  shiprocket.pickup.requestedAt = new Date();
  shiprocket.pickup.message = "Pickup request in progress";
  await saveOrder(order);

  const pickup = await generatePickup(shiprocket.shipmentId);
  return markSuccessfulPickup(order, pickup);
};

const markFulfillmentFailure = async (order, error) => {
  const shiprocket = ensureShiprocket(order);
  const code = error?.code || "SHIPROCKET_FULFILLMENT_FAILED";
  const reason = String(error?.message || "Shiprocket fulfillment failed.").slice(0, 500);
  const unknownOutcome = error?.ambiguous || /_OUTCOME_UNKNOWN$/.test(code);
  const requiresManualReview = error?.ambiguous || error?.actionRequired || [
    "INSUFFICIENT_WALLET_BALANCE",
    "NO_SERVICEABLE_COURIER",
    "NO_ELIGIBLE_COURIER",
    "SHIPROCKET_CONFIGURATION_MISSING",
    "SHIPROCKET_CONFIGURATION_INVALID",
  ].includes(code);

  shiprocket.automationState = requiresManualReview ? "ACTION_REQUIRED" : "PENDING_RETRY";
  shiprocket.failureReason = reason;
  shiprocket.lastErrorCode = code;
  shiprocket.lockAcquiredAt = null;

  if (unknownOutcome && error?.stage === "create_order") {
    shiprocket.remoteOrderState = "UNKNOWN";
    shiprocket.status = "SHIPPING_ACTION_REQUIRED";
  } else if (unknownOutcome && error?.stage === "assign_awb") {
    shiprocket.awbAssignmentState = "UNKNOWN";
    shiprocket.status = "SHIPPING_ACTION_REQUIRED";
  } else if (unknownOutcome && error?.stage === "pickup") {
    shiprocket.pickup.requestState = "UNKNOWN";
    shiprocket.pickup.status = "REQUESTED";
    shiprocket.pickup.message = reason;
    shiprocket.status = "SHIPPING_ACTION_REQUIRED";
  } else if (error instanceof ShiprocketError && error?.stage === "create_order") {
    // The remote create call returned a definite rejection (or failed before
    // being sent), so it is safe to retry creation after the admin fixes it.
    // Keep the same externalOrderId for provider-side idempotency.
    shiprocket.remoteOrderState = "NOT_CREATED";
    shiprocket.status = requiresManualReview ? "SHIPPING_ACTION_REQUIRED" : "ORDER_CONFIRMED";
  } else if (error?.stage === "assign_awb") {
    shiprocket.awbAssignmentState = "NOT_ASSIGNED";
    shiprocket.status = shiprocket.shipmentId ? "SHIPMENT_CREATED" : "SHIPPING_ACTION_REQUIRED";
  } else if (error?.stage === "pickup") {
    shiprocket.pickup.requestState = "NOT_REQUESTED";
    shiprocket.pickup.status = "FAILED";
    shiprocket.pickup.requestedAt = new Date();
    shiprocket.pickup.message = reason;
    shiprocket.status = shiprocket.awbCode ? "AWB_ASSIGNED" : "SHIPPING_ACTION_REQUIRED";
  } else if (requiresManualReview) {
    shiprocket.status = "SHIPPING_ACTION_REQUIRED";
  } else if (shiprocket.shipmentId) {
    shiprocket.status = shiprocket.awbCode ? "AWB_ASSIGNED" : "SHIPMENT_CREATED";
  } else if (!shiprocket.status) {
    shiprocket.status = "ORDER_CONFIRMED";
  }

  return saveOrder(order);
};

const requirePickupPincode = () => {
  if (!isPresent(process.env.SHIPROCKET_PICKUP_PINCODE)) {
    throw new FulfillmentError(
      "SHIPROCKET_PICKUP_PINCODE is required to check courier serviceability.",
      { code: "SHIPROCKET_PICKUP_PINCODE_MISSING", stage: "configuration", status: 503 }
    );
  }
  return normalisePincode(process.env.SHIPROCKET_PICKUP_PINCODE, "Shiprocket pickup PIN code");
};

const prepareSelectedCourier = async (order, base, parcel) => {
  const shiprocket = ensureShiprocket(order);
  const pickupPincode = requirePickupPincode();
  const couriers = await checkServiceability({
    pickupPincode,
    deliveryPincode: base.deliveryPincode,
    cod: base.cod,
    weightKg: parcel.weightKg,
    declaredValue: base.declaredValue,
  });
  const selected = selectCourier(couriers, { cod: base.cod });

  shiprocket.courierId = String(selected.id);
  shiprocket.courierName = selected.name || shiprocket.courierName || "";
  shiprocket.serviceability.checkedAt = new Date();
  shiprocket.serviceability.pickupPincode = pickupPincode;
  shiprocket.serviceability.deliveryPincode = base.deliveryPincode;
  shiprocket.serviceability.selectedCourierCost = selected.cost;
  shiprocket.serviceability.selectedCourierRating = selected.rating;
  shiprocket.parcel.weightKg = parcel.weightKg;
  shiprocket.parcel.lengthCm = parcel.lengthCm;
  shiprocket.parcel.breadthCm = parcel.breadthCm;
  shiprocket.parcel.heightCm = parcel.heightCm;
  await saveOrder(order);
  return selected;
};

const fulfillOrder = async (order) => {
  const shiprocket = ensureShiprocket(order);
  const base = validateBaseOrder(order);

  // Normalise fields used by the remote payload while keeping the original
  // customer order intact in every failure path.
  order.phone = base.phone;
  order.shippingAddress.zip = base.deliveryPincode;

  // An AWB means order creation and courier assignment already succeeded.
  // On retry, resume only the pickup stage instead of re-creating anything.
  if (shiprocket.awbCode) {
    shiprocket.remoteOrderState = "CREATED";
    shiprocket.awbAssignmentState = "ASSIGNED";
    return requestPickup(order);
  }

  if (shiprocket.remoteOrderState === "UNKNOWN") {
    throw new FulfillmentError(
      `Shiprocket order creation has an unknown outcome. Reconcile external order ${shiprocket.externalOrderId || order._id} in Shiprocket before retrying to avoid a duplicate shipment.`,
      { code: "SHIPROCKET_CREATE_OUTCOME_UNKNOWN", stage: "create_order", status: 409 }
    );
  }

  if (shiprocket.orderId && !shiprocket.shipmentId) {
    throw new FulfillmentError(
      "A Shiprocket order ID exists without a shipment ID. Reconcile it in Shiprocket before retrying.",
      { code: "SHIPROCKET_SHIPMENT_ID_MISSING", stage: "create_order", status: 409 }
    );
  }

  if (shiprocket.shipmentId) shiprocket.remoteOrderState = "CREATED";

  const { parcel, orderItems } = await buildParcelAndItems(order);
  const selectedCourier = await prepareSelectedCourier(order, base, parcel);

  if (!shiprocket.shipmentId) {
    shiprocket.externalOrderId = shiprocket.externalOrderId || `PC-${order._id}`;
    // Once the create request starts, do not issue another create attempt until
    // its result is known. This is the key duplicate-shipment guard.
    shiprocket.remoteOrderState = "UNKNOWN";
    shiprocket.status = shiprocket.status || "ORDER_CONFIRMED";
    await saveOrder(order);

    const created = await createShipmentOrder({
      order,
      parcel,
      orderItems,
      externalOrderId: shiprocket.externalOrderId,
      phone: base.phone,
      email: base.email,
    });
    shiprocket.orderId = created.orderId;
    shiprocket.shipmentId = created.shipmentId;
    shiprocket.remoteOrderState = "CREATED";
    shiprocket.remoteOrderCreatedAt = new Date();
    shiprocket.status = "SHIPMENT_CREATED";
    order.orderStatus = "processing";
    await saveOrder(order);
  }

  // A stored shipment ID resumes at AWB assignment. It never creates another
  // Shiprocket order, including after an interrupted admin request.
  if (shiprocket.awbAssignmentState === "UNKNOWN") {
    throw new FulfillmentError(
      "The previous AWB assignment has an unknown outcome. Reconcile the shipment in Shiprocket before retrying to avoid a duplicate AWB.",
      { code: "SHIPROCKET_AWB_OUTCOME_UNKNOWN", stage: "assign_awb", status: 409 }
    );
  }
  shiprocket.awbAssignmentState = "UNKNOWN";
  await saveOrder(order);
  const awb = await assignAWB(shiprocket.shipmentId, selectedCourier.id);
  shiprocket.awbCode = awb.awbCode;
  shiprocket.courierId = awb.courierId || String(selectedCourier.id);
  shiprocket.courierName = awb.courierName || selectedCourier.name || shiprocket.courierName || "";
  shiprocket.trackingUrl = `https://shiprocket.co/tracking/${encodeURIComponent(awb.awbCode)}`;
  shiprocket.awbAssignedAt = new Date();
  shiprocket.awbAssignmentState = "ASSIGNED";
  shiprocket.status = "AWB_ASSIGNED";
  await saveOrder(order);

  return requestPickup(order);
};

// POST /api/admin/shiprocket/ship/:orderId
// This is deliberately the only fulfillment trigger. Order creation, Razorpay
// callbacks, and payment verification never call this service.
const shipOrder = async (req, res) => {
  let order;
  try {
    order = await acquireFulfillmentLock(req.params.orderId);
    const result = await fulfillOrder(order);
    return res.json({
      message: "Shiprocket fulfillment processed successfully",
      order: result,
      fulfillment: {
        courier: result.shiprocket?.courierName || "",
        awb: result.shiprocket?.awbCode || "",
        pickupStatus: result.shiprocket?.pickup?.status || "",
        shippingStatus: result.shiprocket?.status || "",
        automationState: result.shiprocket?.automationState || "",
      },
    });
  } catch (error) {
    const normalized = error instanceof ShiprocketError || error instanceof FulfillmentError
      ? error
      : new ShiprocketError("Shiprocket fulfillment failed.", { stage: "unknown", code: "SHIPROCKET_FULFILLMENT_FAILED" });
    const persistedOrder = order ? await markFulfillmentFailure(order, normalized) : null;

    // Deliberately log only the stage/code; never error.config or headers, which
    // can include an authorization token.
    console.error("Shiprocket fulfillment failed", { stage: normalized.stage, code: normalized.code });
    return res.status(normalized.status || 500).json({
      message: normalized.message,
      failureReason: persistedOrder?.shiprocket?.failureReason || normalized.message,
      code: normalized.code,
      order: persistedOrder || undefined,
    });
  }
};

const extractTrackingShipment = (tracking) => {
  return tracking?.tracking_data?.shipment_track?.[0]
    || tracking?.data?.tracking_data?.shipment_track?.[0]
    || tracking?.data?.shipment_track?.[0]
    || {};
};

const extractTrackingStatus = (tracking) => {
  const shipment = extractTrackingShipment(tracking);
  return shipment.current_status || shipment.status || tracking?.current_status || tracking?.status || "";
};

const firstPresentText = (...values) => {
  const value = values.find(isPresent);
  return value === undefined ? "" : String(value).trim();
};

const parseShiprocketWebhookDate = (value) => {
  if (!isPresent(value)) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  const indianDateTime = text.match(/^(\d{2})\s+(\d{2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  const sqlDateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  const parts = indianDateTime
    ? { day: indianDateTime[1], month: indianDateTime[2], year: indianDateTime[3], hour: indianDateTime[4], minute: indianDateTime[5], second: indianDateTime[6] }
    : sqlDateTime
      ? { year: sqlDateTime[1], month: sqlDateTime[2], day: sqlDateTime[3], hour: sqlDateTime[4], minute: sqlDateTime[5], second: sqlDateTime[6] }
      : null;

  if (parts) {
    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    const second = Number(parts.second);
    if (
      year < 1000 || month < 1 || month > 12 || day < 1 || day > 31 ||
      hour > 23 || minute > 59 || second > 59
    ) return null;

    // Build in UTC first so JavaScript cannot silently normalize invalid dates
    // such as the 31st of a 30-day month, then convert the documented IST time.
    const calendarDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    if (
      calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() !== month - 1 ||
      calendarDate.getUTCDate() !== day
    ) return null;
    return new Date(calendarDate.getTime() - (330 * 60 * 1000));
  }

  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text);
    const date = new Date(text.length === 10 ? numeric * 1000 : numeric);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const latestWebhookScan = (payload) => {
  if (!Array.isArray(payload?.scans)) return null;

  return payload.scans
    .map((scan) => ({ scan, occurredAt: parseShiprocketWebhookDate(scan?.date || scan?.timestamp) }))
    .filter(({ occurredAt }) => occurredAt)
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0] || null;
};

const providerEventKey = ({ awb, currentStatusId, shipmentStatusId, rawStatus, occurredAt }) => {
  const source = [
    awb,
    currentStatusId,
    shipmentStatusId,
    String(rawStatus || "").toUpperCase(),
    occurredAt?.toISOString() || "",
  ].join("|");
  return crypto.createHash("sha256").update(source).digest("hex");
};

const parseShiprocketWebhookEvent = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const latestScan = latestWebhookScan(payload);
  const awb = firstPresentText(payload.awb, payload.awb_code, payload.awbCode);
  const rawStatus = firstPresentText(
    payload.current_status,
    payload.shipment_status,
    latestScan?.scan?.["sr-status-label"],
    latestScan?.scan?.activity
  );
  const occurredAt = parseShiprocketWebhookDate(payload.current_timestamp)
    || latestScan?.occurredAt
    || parseShiprocketWebhookDate(payload.status_date || payload.updated_at || payload.event_time);
  const currentStatusId = firstPresentText(payload.current_status_id);
  const shipmentStatus = firstPresentText(payload.shipment_status);
  const shipmentStatusId = firstPresentText(payload.shipment_status_id);
  return {
    awb,
    courierName: firstPresentText(payload.courier_name, payload.courierName),
    rawStatus,
    friendlyStatus: mapShiprocketStatus(rawStatus),
    currentStatusId,
    shipmentStatus,
    shipmentStatusId,
    occurredAt,
    merchantOrderId: firstPresentText(payload.order_id),
    shiprocketOrderId: firstPresentText(payload.sr_order_id),
    eventKey: providerEventKey({ awb, currentStatusId, shipmentStatusId, rawStatus, occurredAt }),
  };
};

const latestTrackingActivity = (tracking, shipment) => {
  const activities = [
    tracking?.tracking_data?.shipment_track_activities,
    tracking?.data?.tracking_data?.shipment_track_activities,
    tracking?.data?.shipment_track_activities,
    shipment?.shipment_track_activities,
    shipment?.activities,
  ].find(Array.isArray) || [];

  return activities
    .map((activity) => ({
      activity,
      occurredAt: parseShiprocketWebhookDate(
        activity?.date || activity?.timestamp || activity?.activity_date
      ),
    }))
    .filter(({ occurredAt }) => occurredAt)
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0] || null;
};

// The legacy admin tracking route may still be used for inspection. If its
// provider response includes a dated status, it follows the exact same
// timestamp/order guard as a callback; otherwise it remains read-only rather
// than risking a regression of webhook state.
const parseShiprocketTrackingEvent = (tracking, awb) => {
  const shipment = extractTrackingShipment(tracking);
  const latestActivity = latestTrackingActivity(tracking, shipment);
  const rawStatus = firstPresentText(
    extractTrackingStatus(tracking),
    latestActivity?.activity?.["sr-status-label"],
    latestActivity?.activity?.activity
  );
  const occurredAt = parseShiprocketWebhookDate(
    shipment?.current_timestamp || shipment?.current_status_date || shipment?.status_date || shipment?.updated_at
  ) || latestActivity?.occurredAt;
  const currentStatusId = firstPresentText(shipment?.current_status_id, tracking?.current_status_id);
  const shipmentStatus = firstPresentText(shipment?.shipment_status, tracking?.shipment_status);
  const shipmentStatusId = firstPresentText(shipment?.shipment_status_id, tracking?.shipment_status_id);
  const normalizedAwb = firstPresentText(awb);
  const friendlyStatus = mapShiprocketStatus(rawStatus);

  if (!normalizedAwb || !rawStatus || !friendlyStatus || !occurredAt) return null;
  return {
    awb: normalizedAwb,
    courierName: firstPresentText(shipment?.courier_name, tracking?.courier_name),
    rawStatus,
    friendlyStatus,
    currentStatusId,
    shipmentStatus,
    shipmentStatusId,
    occurredAt,
    eventKey: providerEventKey({
      awb: normalizedAwb,
      currentStatusId,
      shipmentStatusId,
      rawStatus,
      occurredAt,
    }),
  };
};

const readWebhookApiKey = (req) => {
  if (typeof req.get === "function") return req.get("x-api-key");
  return req.headers?.["x-api-key"];
};

const verifyShiprocketWebhookToken = (req) => {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  const provided = readWebhookApiKey(req);
  if (!isPresent(expected)) return { valid: false, configurationError: true };
  if (typeof provided !== "string") return { valid: false, configurationError: false };

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return { valid: false, configurationError: false };

  return {
    valid: crypto.timingSafeEqual(expectedBuffer, providedBuffer),
    configurationError: false,
  };
};

const hasWebhookReferenceMismatch = (order, event) => {
  const shiprocket = order.shiprocket || {};
  return (
    (isPresent(event.merchantOrderId) && isPresent(shiprocket.externalOrderId) && event.merchantOrderId !== shiprocket.externalOrderId) ||
    (isPresent(event.shiprocketOrderId) && isPresent(shiprocket.orderId) && event.shiprocketOrderId !== shiprocket.orderId)
  );
};

const asValidDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const applyShiprocketWebhookEvent = async (order, event, { source = "webhook" } = {}) => {
  const shiprocket = ensureShiprocket(order);
  const previousEventAt = asValidDate(shiprocket.lastProviderEventAt);

  if (shiprocket.lastProviderEventKey === event.eventKey) {
    return { outcome: "duplicate", order };
  }
  if (previousEventAt && event.occurredAt.getTime() <= previousEventAt.getTime()) {
    return { outcome: "stale", order };
  }

  const update = {
    "shiprocket.lastProviderStatus": event.rawStatus,
    "shiprocket.lastProviderEventAt": event.occurredAt,
    "shiprocket.lastProviderEventKey": event.eventKey,
    "shiprocket.lastStatusUpdatedAt": new Date(),
  };
  if (source === "webhook") update["shiprocket.lastWebhookReceivedAt"] = new Date();
  if (event.currentStatusId) update["shiprocket.lastProviderStatusId"] = event.currentStatusId;
  if (event.shipmentStatus) update["shiprocket.lastShipmentStatus"] = event.shipmentStatus;
  if (event.shipmentStatusId) update["shiprocket.lastShipmentStatusId"] = event.shipmentStatusId;
  if (event.courierName) update["shiprocket.courierName"] = event.courierName;
  if (event.friendlyStatus) update["shiprocket.status"] = event.friendlyStatus;

  if (event.friendlyStatus === "PICKUP_SCHEDULED") {
    update["shiprocket.pickup.requestState"] = "SCHEDULED";
    update["shiprocket.pickup.status"] = "SCHEDULED";
    update["shiprocket.pickup.scheduledAt"] = event.occurredAt;
    update["shiprocket.automationState"] = "COMPLETED";
    update["shiprocket.failureReason"] = "";
    update["shiprocket.lastErrorCode"] = "";
  }
  if (PICKUP_CONFIRMED_STATUSES.has(event.friendlyStatus)) {
    update["shiprocket.pickup.requestState"] = "SCHEDULED";
    update["shiprocket.pickup.status"] = "PICKED_UP";
    update["shiprocket.automationState"] = "COMPLETED";
    update["shiprocket.failureReason"] = "";
    update["shiprocket.lastErrorCode"] = "";
  }

  if (event.friendlyStatus === "DELIVERED") {
    update.orderStatus = "delivered";
  } else if (
    ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(event.friendlyStatus) &&
    !["cancelled", "delivered"].includes(order.orderStatus)
  ) {
    update.orderStatus = "shipped";
  }

  // The timestamp condition makes duplicate concurrent deliveries and delayed
  // callbacks harmless. Webhooks never create or modify a remote shipment.
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      "shiprocket.awbCode": event.awb,
      $or: [
        { "shiprocket.lastProviderEventAt": null },
        { "shiprocket.lastProviderEventAt": { $lt: event.occurredAt } },
      ],
    },
    { $set: update },
    { new: true, runValidators: true }
  );

  return updatedOrder
    ? { outcome: "updated", order: updatedOrder }
    : { outcome: "stale", order };
};

// POST /api/shipping/webhook
// Shiprocket sends the configured x-api-key. This endpoint has no admin/JWT
// middleware because it is called server-to-server, and it never makes an
// outbound Shiprocket request.
const shiprocketWebhook = async (req, res) => {
  const tokenCheck = verifyShiprocketWebhookToken(req);
  if (tokenCheck.configurationError) {
    return res.status(503).json({ message: "Shiprocket webhook is not configured" });
  }
  if (!tokenCheck.valid) {
    return res.status(401).json({ message: "Unauthorized webhook" });
  }

  try {
    const event = parseShiprocketWebhookEvent(req.body);
    if (!event?.awb || !event.rawStatus || !event.friendlyStatus || !event.occurredAt) {
      return res.status(200).json({ received: true, outcome: "ignored" });
    }

    const order = await Order.findOne({ "shiprocket.awbCode": event.awb });
    if (!order || hasWebhookReferenceMismatch(order, event)) {
      return res.status(200).json({ received: true, outcome: "ignored" });
    }

    const result = await applyShiprocketWebhookEvent(order, event);
    return res.status(200).json({ received: true, outcome: result.outcome });
  } catch (error) {
    // Do not log raw callback bodies or x-api-key values.
    console.error("Shiprocket webhook update failed", { code: "SHIPROCKET_WEBHOOK_UPDATE_FAILED" });
    return res.status(500).json({ message: "Unable to process Shiprocket webhook" });
  }
};

// GET /api/admin/shiprocket/track/:orderId
const trackOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.shiprocket?.awbCode) {
      return res.status(400).json({ message: "No AWB has been assigned to this order" });
    }

    const tracking = await trackShipment(order.shiprocket.awbCode);
    const event = parseShiprocketTrackingEvent(tracking, order.shiprocket.awbCode);
    const result = event
      ? await applyShiprocketWebhookEvent(order, event, { source: "manual_tracking" })
      : { outcome: "ignored", order };

    return res.json({ tracking, order: result.order, trackingUpdate: result.outcome });
  } catch (error) {
    const normalized = error instanceof ShiprocketError
      ? error
      : new ShiprocketError("Unable to retrieve Shiprocket tracking.", { stage: "tracking" });
    console.error("Shiprocket tracking failed", { stage: normalized.stage, code: normalized.code });
    return res.status(normalized.status || 500).json({ message: normalized.message, code: normalized.code });
  }
};

module.exports = {
  shipOrder,
  trackOrder,
  fulfillOrder,
  shiprocketWebhook,
  parseShiprocketWebhookDate,
  parseShiprocketWebhookEvent,
  parseShiprocketTrackingEvent,
  verifyShiprocketWebhookToken,
  applyShiprocketWebhookEvent,
};
