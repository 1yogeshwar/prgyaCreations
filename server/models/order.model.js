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
    orderId:      { type: String, default: "" },   // Shiprocket order_id
    shipmentId:   { type: String, default: "" },   // Shiprocket shipment_id
    awbCode:      { type: String, default: "" },   // Courier tracking number
    courierName:  { type: String, default: "" },
    trackingUrl:  { type: String, default: "" },
    status:       { type: String, default: "" },
  },

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);