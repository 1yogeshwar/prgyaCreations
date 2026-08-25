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
// const createPaymentOrder = async (req, res) => {
//   try {
//     const { amount } = req.body;
//     const razorpay   = getRazorpay(); // ✅ only created when called
//     const options    = {
//       amount:   Math.round(amount * 100),
//       currency: "INR",
//       receipt:  `receipt_${Date.now()}`,
//     };
//     const order = await razorpay.orders.create(options);
//     res.json({
//       orderId:  order.id,
//       amount:   order.amount,
//       currency: order.currency,
//       key:      process.env.RAZORPAY_KEY_ID,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
const createPaymentOrder = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    const productIds = items.map(i => i.product);
    const dbProducts  = await Product.find({ _id: { $in: productIds } });

    const subtotal = items.reduce((sum, item) => {
      const dbProduct = dbProducts.find(p => p._id.toString() === item.product);
      if (!dbProduct) throw new Error(`Product not found: ${item.product}`);
      return sum + dbProduct.price * item.quantity;
    }, 0);

    // const shipping = subtotal > 500 ? 0 : 99;
    const shipping = subtotal;
    const tax      = Math.round(subtotal * 0.08);
    const total    = subtotal + shipping + tax;

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   Math.round(total * 100), // paise
      currency: "INR",
      receipt:  `receipt_${Date.now()}`,
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      key:      process.env.RAZORPAY_KEY_ID,
      // Return the calculated breakdown so client stays in sync
      subtotal, shipping, tax, total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// POST /api/payment/verify
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    const body        = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSig !== razorpay_signature)
      return res.status(400).json({ message: "Payment verification failed" });

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: "paid",
      paymentId:     razorpay_payment_id,
    });

    res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createPaymentOrder, verifyPayment };