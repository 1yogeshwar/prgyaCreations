const Order = require("../models/order.model");
const Product = require("../models/product.model");

// POST /api/orders — works for both guest and logged-in
// const createOrder = async (req, res) => {
//   try {
//     const {
//       items, shippingAddress, subtotal, tax, shipping, total,
//       razorpayOrderId, paymentMethod, guestEmail, phone,
//     } = req.body;

//     const paymentStatus = paymentMethod === "online" ? "pending" : "awaiting_confirmation";

//     const order = await Order.create({
//       user:       req.user?._id || null,
//       isGuest:    !req.user,
//       guestEmail: guestEmail || req.user?.email,
//       phone,
//       items, shippingAddress, subtotal, tax, shipping, total,
//       razorpayOrderId, paymentMethod, paymentStatus,
//     });

//     res.status(201).json(order);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };



const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, guestEmail, phone } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ message: "No items in order" });

    const productIds = items.map(i => i.product);
    const dbProducts = await Product.find({ _id: { $in: productIds } });

    const validatedItems = items.map(item => {
      const dbProduct = dbProducts.find(p => p._id.toString() === item.product);
      if (!dbProduct) throw new Error(`Product not found: ${item.product}`);
      return {
        product:  dbProduct._id,
        name:     dbProduct.name,
        image:    dbProduct.images?.[0] || "",
        price:    dbProduct.price,
        quantity: item.quantity,
      };
    });

    // ✅ Server recalculates EVERYTHING — never trust client numbers
    const subtotal = validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = subtotal > 500 ? 0 : 99;   // ← your actual current rule
    const tax      = Math.round(subtotal * 0.08);
    const total    = subtotal + shipping + tax;

    const paymentStatus = paymentMethod === "online" ? "pending" : "awaiting_confirmation";

    const order = await Order.create({
      user: req.user?._id || null,
      isGuest: !req.user,
      guestEmail, phone,
      items: validatedItems,
      shippingAddress,
      subtotal, tax, shipping, total,   // ← always server-calculated
      paymentMethod, paymentStatus,
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/orders — logged-in user's own orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product", "name images");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: GET /api/admin/orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: PUT /api/admin/orders/:id
const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: req.body.orderStatus },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, getAllOrders, updateOrderStatus };