// const mongoose = require("mongoose");
// const crypto = require("crypto");

// const orderSchema = new mongoose.Schema({
//   user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
//   isGuest:    { type: Boolean, default: false },
//   guestEmail: { type: String },
//   phone:      { type: String },

//   items: [{
//     product:       { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
//     name:          String,
//     image:         String,
//     price:         Number,
//     quantity:      Number,
//     selectedColor: String,
//     selectedSize:  String,
//   }],

//   shippingAddress: {
//     firstName: String,
//     lastName:  String,
//     address:   String,
//     city:      String,
//     state:     String,
//     zip:       String,
//   },

//   subtotal: { type: Number, required: true },
//   tax:      { type: Number, required: true },
//   shipping: { type: Number, required: true },
//   total:    { type: Number, required: true },

//   paymentMethod: {
//     type: String,
//     enum: ["online", "cod", "phone_confirm"],
//     default: "online",
//   },
//   paymentStatus: {
//     type: String,
//     enum: ["pending", "paid", "failed", "awaiting_confirmation"],
//     default: "pending",
//   },
//   paymentId:       { type: String },
//   razorpayOrderId: { type: String },

//   orderStatus: {
//     type: String,
//     enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
//     default: "pending",
//   },

//   trackingToken: {
//     type:    String,
//     unique:  true,
//     default: () => crypto.randomBytes(16).toString("hex"),
//   },
// }, { timestamps: true });

// module.exports = mongoose.model("Order", orderSchema);



const mongoose = require("mongoose");
const crypto = require("crypto");

const SHIPROCKET_SHIPPING_STATUSES = [
  "",
  "ORDER_CONFIRMED",
  "SHIPMENT_CREATED",
  "AWB_ASSIGNED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RTO",
  "SHIPPING_ACTION_REQUIRED",
];

const SHIPROCKET_AUTOMATION_STATES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "PENDING_RETRY",
  "COMPLETED",
  "ACTION_REQUIRED",
];

const orderSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isGuest:    { type: Boolean, default: false },
  guestEmail: { type: String },
  phone:      { type: String },

  items: [{
    product:       { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name:          String,
    image:         String,
    price:         Number,
    quantity:      Number,
    selectedColor: String,
    selectedSize:  String,
  }],

  shippingAddress: {
    firstName: String,
    lastName:  String,
    address:   String,
    city:      String,
    state:     String,
    zip:       String,
  },

  subtotal: { type: Number, required: true },
  tax:      { type: Number, required: true },
  shipping: { type: Number, required: true },
  total:    { type: Number, required: true },

  paymentMethod: {
    type: String,
    enum: ["online", "cod", "phone_confirm"],
    default: "online",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "awaiting_confirmation"],
    default: "pending",
  },
  paymentId:       { type: String },
  razorpayOrderId: { type: String },

  orderStatus: {
    type: String,
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },

  trackingToken: {
    type:    String,
    unique:  true,
    default: () => crypto.randomBytes(16).toString("hex"),
  },

  // ── Shiprocket shipping details ──
  shiprocket: {
    // Identifiers returned by Shiprocket. Keep the existing field names so
    // the current admin screen remains compatible.
    orderId:      { type: String, default: "" },   // Shiprocket order_id
    shipmentId:   { type: String, default: "" },   // Shiprocket shipment_id
    courierId:    { type: String, default: "" },
    awbCode:      { type: String, default: "" },   // Courier tracking number
    courierName:  { type: String, default: "" },
    trackingUrl:  { type: String, default: "" },

    // Customer-friendly state; never store a raw courier status here.
    status: {
      type: String,
      enum: SHIPROCKET_SHIPPING_STATUSES,
      default: "",
    },
    lastProviderStatus: { type: String, default: "" },
    lastProviderStatusId: { type: String, default: "" },
    lastShipmentStatus: { type: String, default: "" },
    lastShipmentStatusId: { type: String, default: "" },
    lastStatusUpdatedAt: { type: Date, default: null },
    // Webhook ordering and replay protection. These persist only metadata, not
    // the incoming payload, so callbacks cannot duplicate or regress status.
    lastProviderEventAt: { type: Date, default: null },
    lastProviderEventKey: { type: String, default: "" },
    lastWebhookReceivedAt: { type: Date, default: null },

    // Lifecycle and retry information for the resumable automation.
    automationState: {
      type: String,
      enum: SHIPROCKET_AUTOMATION_STATES,
      default: "NOT_STARTED",
    },
    remoteOrderState: {
      type: String,
      enum: ["NOT_CREATED", "CREATED", "UNKNOWN"],
      default: "NOT_CREATED",
    },
    // Stable merchant-side reference sent to Shiprocket. It is persisted before
    // a create request so an ambiguous response is never blindly recreated.
    externalOrderId: { type: String, default: "" },
    awbAssignmentState: {
      type: String,
      enum: ["NOT_ASSIGNED", "ASSIGNED", "UNKNOWN"],
      default: "NOT_ASSIGNED",
    },
    failureReason: { type: String, default: "" },
    lastErrorCode: { type: String, default: "" },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    lockAcquiredAt: { type: Date, default: null },

    remoteOrderCreatedAt: { type: Date, default: null },
    awbAssignedAt: { type: Date, default: null },
    serviceability: {
      checkedAt: { type: Date, default: null },
      pickupPincode: { type: String, default: "" },
      deliveryPincode: { type: String, default: "" },
      selectedCourierCost: { type: Number, default: null },
      selectedCourierRating: { type: Number, default: null },
    },
    parcel: {
      weightKg: { type: Number, default: null },
      lengthCm: { type: Number, default: null },
      breadthCm: { type: Number, default: null },
      heightCm: { type: Number, default: null },
    },
    pickup: {
      requestState: {
        type: String,
        enum: ["NOT_REQUESTED", "REQUESTED", "SCHEDULED", "UNKNOWN"],
        default: "NOT_REQUESTED",
      },
      status: {
        type: String,
        enum: ["", "REQUESTED", "SCHEDULED", "PICKED_UP", "FAILED"],
        default: "",
      },
      requestedAt: { type: Date, default: null },
      scheduledAt: { type: Date, default: null },
      token: { type: String, default: "" },
      message: { type: String, default: "" },
    },
  },

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
