const crypto = require("crypto");
const Order  = require("../models/order.model");

// ✅ Move inside functions — not at top level
const getRazorpay = () => {
  const Razorpay = require("razorpay");
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// POST /api/payment/create-order
const createPaymentOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const razorpay   = getRazorpay(); // ✅ only created when called
    const options    = {
      amount:   Math.round(amount * 100),
      currency: "INR",
      receipt:  `receipt_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      key:      process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/payment/verify
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId)
      return res.status(400).json({ message: "Incomplete Razorpay payment verification data" });

    const body        = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSig !== razorpay_signature)
      return res.status(400).json({ message: "Payment verification failed" });

    const order = await Order.findById(orderId)
      .select("paymentMethod paymentStatus paymentId razorpayOrderId");
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod !== "online")
      return res.status(409).json({ message: "This order is not an online payment order" });
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id)
      return res.status(409).json({ message: "Razorpay payment does not match this customer order" });

    if (order.paymentStatus === "paid") {
      if (order.paymentId === razorpay_payment_id)
        return res.json({ success: true, paymentId: razorpay_payment_id });
      return res.status(409).json({ message: "A different Razorpay payment is already recorded for this order" });
    }

    // Records payment evidence only. Shiprocket fulfillment is deliberately
    // started exclusively by the protected admin shipment endpoint.
    const updatedOrder = await Order.findOneAndUpdate({
      _id: orderId,
      paymentStatus: { $ne: "paid" },
    }, {
      paymentStatus: "paid",
      paymentId:     razorpay_payment_id,
    }, { new: true });
    if (!updatedOrder)
      return res.status(409).json({ message: "Payment status changed while verification was processing" });

    res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createPaymentOrder, verifyPayment };
