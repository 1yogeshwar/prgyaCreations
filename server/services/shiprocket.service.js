const axios = require("axios");

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";
const REQUEST_TIMEOUT_MS = 25_000;

let cachedToken = null;
let tokenExpiry = null;

class ShiprocketError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ShiprocketError";
    this.stage = options.stage || "unknown";
    this.code = options.code || "SHIPROCKET_ERROR";
    this.status = options.status || 502;
    this.retryable = Boolean(options.retryable);
    this.ambiguous = Boolean(options.ambiguous);
  }
}

const isPresent = (value) => value !== undefined && value !== null && String(value).trim() !== "";
const toNumber = (value) => {
  if (!isPresent(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pick = (source, keys) => {
  for (const key of keys) {
    if (isPresent(source?.[key])) return source[key];
  }
  return "";
};

const providerMessage = (data) => {
  if (typeof data === "string") return data.slice(0, 500);
  if (!data || typeof data !== "object") return "";

  const message = pick(data, ["message", "error", "detail", "description"]);
  if (typeof message === "string") return message.slice(0, 500);
  if (Array.isArray(data.errors)) {
    return data.errors
      .map((error) => typeof error === "string" ? error : pick(error, ["message", "error"]))
      .filter(Boolean)
      .join("; ")
      .slice(0, 500);
  }
  return "";
};

const isWalletError = (message) => /wallet|insufficient\s+(?:balance|fund|credit)|low\s+balance/i.test(message);

const toShiprocketError = (error, stage) => {
  if (error instanceof ShiprocketError) return error;

  const status = error?.response?.status;
  const message = providerMessage(error?.response?.data) || "Shiprocket request failed";
  const isNetworkFailure = !status || error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT";
  const ambiguous = ["create_order", "assign_awb", "pickup"].includes(stage)
    && (isNetworkFailure || status >= 500);

  if (isWalletError(message)) {
    return new ShiprocketError(
      "Shiprocket wallet balance is insufficient. Recharge the wallet, then retry this shipment.",
      { stage, code: "INSUFFICIENT_WALLET_BALANCE", status: 409, retryable: true }
    );
  }

  return new ShiprocketError(
    message,
    {
      stage,
      code: `SHIPROCKET_${stage.toUpperCase()}_FAILED`,
      status: status >= 400 && status < 500 ? 400 : 502,
      retryable: !ambiguous,
      ambiguous,
    }
  );
};

// Authentication and configuration failures happen before a particular
// operation reaches Shiprocket. Re-tagging them with the operation lets the
// fulfillment state machine safely resume that operation after the issue is
// corrected, without treating it as an unknown remote side effect.
const asOperationError = (error, stage) => {
  if (error instanceof ShiprocketError) {
    return new ShiprocketError(error.message, {
      stage,
      code: error.code,
      status: error.status,
      retryable: error.retryable,
      ambiguous: error.ambiguous,
    });
  }
  return toShiprocketError(error, stage);
};

const authorizationHeaders = (token) => ({ Authorization: `Bearer ${token}` });

const requireCredentials = () => {
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
    throw new ShiprocketError(
      "Shiprocket API credentials are not configured on the server.",
      { stage: "configuration", code: "SHIPROCKET_CONFIGURATION_MISSING", status: 503 }
    );
  }
};

const requirePickupLocation = () => {
  const pickupLocation = String(process.env.SHIPROCKET_PICKUP_LOCATION || "").trim();
  if (!pickupLocation) {
    throw new ShiprocketError(
      "SHIPROCKET_PICKUP_LOCATION is required and must exactly match a registered Shiprocket pickup nickname.",
      { stage: "configuration", code: "SHIPROCKET_PICKUP_LOCATION_MISSING", status: 503 }
    );
  }
  return pickupLocation;
};

const parseOptionalPositiveNumber = (name) => {
  const raw = process.env[name];
  if (!isPresent(raw)) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new ShiprocketError(
      `${name} must be a non-negative number when configured.`,
      { stage: "configuration", code: "SHIPROCKET_CONFIGURATION_INVALID", status: 503 }
    );
  }
  return value;
};

// Shiprocket tokens currently last for 10 days. Keep them in process only, never
// persist or log them.
const getToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken;

  requireCredentials();
  try {
    const response = await axios.post(
      `${SHIPROCKET_BASE}/auth/login`,
      { email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD },
      { timeout: REQUEST_TIMEOUT_MS }
    );
    const token = response?.data?.token;
    if (!token) {
      throw new ShiprocketError(
        "Shiprocket did not return an authorization token.",
        { stage: "authentication", code: "SHIPROCKET_AUTH_TOKEN_MISSING", status: 502 }
      );
    }
    cachedToken = token;
    tokenExpiry = Date.now() + (9 * 24 * 60 * 60 * 1000);
    return cachedToken;
  } catch (error) {
    throw toShiprocketError(error, "authentication");
  }
};

const resetTokenCache = () => {
  cachedToken = null;
  tokenExpiry = null;
};

const getAvailableCouriers = (payload) =>
  payload?.data?.available_courier_companies ||
  payload?.available_courier_companies ||
  payload?.response?.data?.available_courier_companies ||
  [];

const isExplicitlyFalse = (value) => [false, 0, "0", "false", "no", "n"].includes(
  typeof value === "string" ? value.toLowerCase() : value
);

const getCourierCost = (courier) => toNumber(pick(courier, [
  "rate", "total_charge", "shipping_charge", "freight_charge", "freight_charge_with_tax",
]));

const getCourierRating = (courier) => toNumber(pick(courier, [
  "rating", "courier_rating", "performance_rating",
]));

const selectCourier = (couriers, { cod }) => {
  const maxCost = parseOptionalPositiveNumber("SHIPROCKET_COURIER_MAX_COST");
  const minRating = parseOptionalPositiveNumber("SHIPROCKET_COURIER_MIN_RATING");

  const eligible = couriers
    .filter((courier) => !isExplicitlyFalse(courier?.is_serviceable))
    .filter((courier) => !cod || !isExplicitlyFalse(courier?.cod))
    .map((courier) => ({
      raw: courier,
      id: pick(courier, ["courier_company_id", "courier_id", "id"]),
      name: pick(courier, ["courier_name", "name", "courier_company_name"]),
      cost: getCourierCost(courier),
      rating: getCourierRating(courier),
    }))
    .filter((courier) => isPresent(courier.id))
    // Once an admin configures a hard policy, an unknown provider value must
    // not silently bypass it.
    .filter((courier) => maxCost === null || (courier.cost !== null && courier.cost <= maxCost))
    .filter((courier) => minRating === null || (courier.rating !== null && courier.rating >= minRating));

  if (eligible.length === 0) {
    throw new ShiprocketError(
      "No Shiprocket courier is eligible for this shipment and the configured serviceability rules.",
      { stage: "serviceability", code: "NO_ELIGIBLE_COURIER", status: 409 }
    );
  }

  eligible.sort((left, right) => {
    const leftRating = left.rating ?? -1;
    const rightRating = right.rating ?? -1;
    if (rightRating !== leftRating) return rightRating - leftRating;

    const leftCost = left.cost ?? Number.POSITIVE_INFINITY;
    const rightCost = right.cost ?? Number.POSITIVE_INFINITY;
    if (leftCost !== rightCost) return leftCost - rightCost;

    return String(left.name).localeCompare(String(right.name));
  });

  return eligible[0];
};

const checkServiceability = async ({ pickupPincode, deliveryPincode, cod, weightKg, declaredValue }) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `${SHIPROCKET_BASE}/courier/serviceability/`,
      {
        headers: authorizationHeaders(token),
        params: {
          pickup_postcode: pickupPincode,
          delivery_postcode: deliveryPincode,
          cod: cod ? 1 : 0,
          weight: weightKg,
          declared_value: declaredValue,
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );
    const couriers = getAvailableCouriers(response.data);
    if (!Array.isArray(couriers) || couriers.length === 0) {
      throw new ShiprocketError(
        "No Shiprocket courier is serviceable for this pickup and delivery PIN combination.",
        { stage: "serviceability", code: "NO_SERVICEABLE_COURIER", status: 409 }
      );
    }
    return couriers;
  } catch (error) {
    throw asOperationError(error, "serviceability");
  }
};

const createShipmentOrder = async ({ order, parcel, orderItems, externalOrderId, phone, email }) => {
  try {
    const token = await getToken();
    const pickupLocation = requirePickupLocation();
    const orderDate = new Date(order.createdAt || Date.now());
    const payload = {
      order_id: externalOrderId,
      order_date: (Number.isNaN(orderDate.getTime()) ? new Date() : orderDate).toISOString().split("T")[0],
      pickup_location: pickupLocation,
      billing_customer_name: order.shippingAddress.firstName,
      billing_last_name: order.shippingAddress.lastName || "",
      billing_address: order.shippingAddress.address,
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.zip,
      billing_state: order.shippingAddress.state,
      billing_country: "India",
      billing_email: email,
      billing_phone: phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
      // Shiprocket uses sub_total as the COD collectible amount. Use the full
      // customer-facing order total so COD collection stays accurate.
      sub_total: Number(order.total),
      length: parcel.lengthCm,
      breadth: parcel.breadthCm,
      height: parcel.heightCm,
      weight: parcel.weightKg,
    };
    const response = await axios.post(
      `${SHIPROCKET_BASE}/orders/create/adhoc`,
      payload,
      { headers: authorizationHeaders(token), timeout: REQUEST_TIMEOUT_MS }
    );
    const data = response.data || {};
    const shipmentId = pick(data, ["shipment_id", "shipmentId"]);
    const orderId = pick(data, ["order_id", "orderId"]);
    if (!shipmentId || !orderId) {
      throw new ShiprocketError(
        "Shiprocket did not return both an order ID and shipment ID.",
        { stage: "create_order", code: "SHIPROCKET_CREATE_RESPONSE_INVALID", status: 502, ambiguous: true }
      );
    }
    return { data, orderId: String(orderId), shipmentId: String(shipmentId) };
  } catch (error) {
    throw asOperationError(error, "create_order");
  }
};

const assignAWB = async (shipmentId, courierId) => {
  try {
    const token = await getToken();
    const response = await axios.post(
      `${SHIPROCKET_BASE}/courier/assign/awb`,
      { shipment_id: shipmentId, courier_id: courierId },
      { headers: authorizationHeaders(token), timeout: REQUEST_TIMEOUT_MS }
    );
    const data = response.data || {};
    const result = data?.response?.data || data?.data || data;
    const awbCode = pick(result, ["awb_code", "awbCode"]);
    if (!awbCode) {
      throw new ShiprocketError(
        "Shiprocket did not return an AWB for this shipment.",
        { stage: "assign_awb", code: "SHIPROCKET_AWB_RESPONSE_INVALID", status: 502, ambiguous: true }
      );
    }
    return {
      data,
      awbCode: String(awbCode),
      courierName: String(pick(result, ["courier_name", "courierName"]) || ""),
      courierId: String(pick(result, ["courier_company_id", "courier_id", "courierId"]) || courierId),
    };
  } catch (error) {
    throw asOperationError(error, "assign_awb");
  }
};

const generatePickup = async (shipmentId) => {
  try {
    const token = await getToken();
    const response = await axios.post(
      `${SHIPROCKET_BASE}/courier/generate/pickup`,
      { shipment_id: [shipmentId] },
      { headers: authorizationHeaders(token), timeout: REQUEST_TIMEOUT_MS }
    );
    const data = response.data || {};
    const result = data?.response?.data || data?.data || data;
    if (isExplicitlyFalse(data?.pickup_status) || isExplicitlyFalse(result?.pickup_status)) {
      throw new ShiprocketError(
        providerMessage(data) || "Shiprocket could not schedule this pickup.",
        { stage: "pickup", code: "SHIPROCKET_PICKUP_REJECTED", status: 409 }
      );
    }
    return {
      data,
      status: "SCHEDULED",
      scheduledAt: pick(result, ["pickup_scheduled_date", "pickup_date", "scheduled_date"]),
      token: String(pick(result, ["pickup_token_number", "pickup_token", "token"]) || ""),
      message: String(pick(result, ["message", "pickup_message"]) || "Pickup requested successfully"),
    };
  } catch (error) {
    throw asOperationError(error, "pickup");
  }
};

const mapShiprocketStatus = (rawStatus) => {
  const value = String(rawStatus || "").trim().toUpperCase();
  if (!value) return "";
  if (value.includes("OUT FOR DELIVERY")) return "OUT_FOR_DELIVERY";
  if (value.includes("RTO") || value.includes("RETURN TO ORIGIN")) return "RTO";
  if (value.includes("DELIVERY FAILED") || value.includes("UNDELIVERED")) return "DELIVERY_FAILED";
  if (value.includes("DELIVERED")) return "DELIVERED";
  if (value.includes("IN TRANSIT") || value.includes("TRANSIT")) return "IN_TRANSIT";
  if (value.includes("PICKED UP")) return "PICKED_UP";
  if (value.includes("PICKUP") && (value.includes("SCHEDULED") || value.includes("REQUESTED") || value.includes("GENERATED") || value.includes("QUEUED") || value.includes("RESCHEDULED"))) return "PICKUP_SCHEDULED";
  if (value === "SHIPPED" || value.includes(" SHIPPED")) return "IN_TRANSIT";
  if (value.includes("AWB") || value.includes("READY TO SHIP")) return "AWB_ASSIGNED";
  if (value.includes("SHIPMENT") || value.includes("NEW")) return "SHIPMENT_CREATED";
  return "";
};

const trackShipment = async (awbCode) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `${SHIPROCKET_BASE}/courier/track/awb/${encodeURIComponent(awbCode)}`,
      { headers: authorizationHeaders(token), timeout: REQUEST_TIMEOUT_MS }
    );
    return response.data;
  } catch (error) {
    throw asOperationError(error, "tracking");
  }
};

module.exports = {
  ShiprocketError,
  getToken,
  resetTokenCache,
  checkServiceability,
  selectCourier,
  createShipmentOrder,
  assignAWB,
  generatePickup,
  mapShiprocketStatus,
  trackShipment,
};
