const Order = require("../models/order.model");
const Product = require("../models/product.model");

const MINIMUM_ORDER_AMOUNT = 500;


// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      razorpayOrderId,
      guestEmail,
      phone,
    } = req.body;

    const selectedPaymentMethod =
      paymentMethod || "online";

    /*
     * At the moment only online payment
     * is enabled from customer checkout.
     */
    if (selectedPaymentMethod !== "online") {
      return res.status(400).json({
        message:
          "Only online payment is currently available",
      });
    }

    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "No items in order",
      });
    }

    if (
      !shippingAddress?.address ||
      !shippingAddress?.city
    ) {
      return res.status(400).json({
        message:
          "Shipping address incomplete",
      });
    }

    if (!guestEmail && !req.user) {
      return res.status(400).json({
        message:
          "Email is required",
      });
    }

    if (
      !String(
        razorpayOrderId || ""
      ).trim()
    ) {
      return res.status(400).json({
        message:
          "Razorpay order reference is required for online payment",
      });
    }

    /*
     * Validate item payload.
     */
    for (const item of items) {
      const quantity =
        Number(item.quantity);

      if (
        !item.product ||
        !Number.isInteger(
          quantity
        ) ||
        quantity < 1
      ) {
        return res.status(400).json({
          message:
            "Invalid product or quantity",
        });
      }
    }

    /*
     * Use unique product IDs so multiple
     * variants / repeated items don't break
     * the database lookup.
     */
    const productIds = [
      ...new Set(
        items.map((item) =>
          String(item.product)
        )
      ),
    ];

    const dbProducts =
      await Product.find({
        _id: {
          $in: productIds,
        },
      });

    /*
     * Build validated order items using
     * actual MongoDB prices.
     */
    const validatedItems =
      items.map((item) => {
        const dbProduct =
          dbProducts.find(
            (product) =>
              product._id.toString() ===
              String(item.product)
          );

        if (!dbProduct) {
          throw new Error(
            `Product not found: ${item.product}`
          );
        }

        const quantity =
          Number(item.quantity);

        if (
          dbProduct.stock <
          quantity
        ) {
          throw new Error(
            `Not enough stock for: ${dbProduct.name}`
          );
        }

        return {
          product:
            dbProduct._id,

          name:
            dbProduct.name,

          image:
            dbProduct.images?.[0] ||
            "",

          // Never trust client price
          price:
            dbProduct.price,

          quantity,

          selectedColor:
            item.selectedColor ||
            "",

          selectedSize:
            item.selectedSize ||
            "",
        };
      });

    /*
     * Calculate subtotal using DB prices.
     */
    const subtotal =
      validatedItems.reduce(
        (sum, item) =>
          sum +
          Number(item.price) *
            item.quantity,
        0
      );

    /*
     * Minimum order ₹500.
     */
    if (
      subtotal <
      MINIMUM_ORDER_AMOUNT
    ) {
      return res.status(400).json({
        message:
          "Minimum order value is ₹500",
      });
    }

    /*
     * Current business rules:
     *
     * Tax      = 0
     * Shipping = 0
     */
    const shipping = 0;
    const tax = 0;

    const total =
      subtotal;

    const paymentStatus =
      "pending";

    const order =
      await Order.create({
        user:
          req.user?._id ||
          null,

        isGuest:
          !req.user,

        guestEmail:
          guestEmail ||
          req.user?.email,

        phone,

        items:
          validatedItems,

        shippingAddress,

        subtotal,

        shipping,

        tax,

        total,

        paymentMethod:
          "online",

        paymentStatus,

        razorpayOrderId:
          String(
            razorpayOrderId
          ).trim(),
      });

    return res
      .status(201)
      .json(order);
  } catch (err) {
    console.error(
      "Create order error:",
      err
    );

    return res
      .status(500)
      .json({
        message:
          err.message,
      });
  }
};


// GET /api/orders
const getMyOrders = async (
  req,
  res
) => {
  try {
    const orders =
      await Order.find({
        user:
          req.user._id,
      }).sort({
        createdAt: -1,
      });

    return res.json(
      orders
    );
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          err.message,
      });
  }
};


// GET /api/orders/:id
const getOrderById = async (
  req,
  res
) => {
  try {
    const order =
      await Order.findById(
        req.params.id
      ).populate(
        "items.product",
        "name images"
      );

    if (!order) {
      return res
        .status(404)
        .json({
          message:
            "Order not found",
        });
    }

    return res.json(
      order
    );
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          err.message,
      });
  }
};


// Admin GET orders
const getAllOrders = async (
  req,
  res
) => {
  try {
    const orders =
      await Order.find()
        .populate(
          "user",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    return res.json(
      orders
    );
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          err.message,
      });
  }
};


// Admin update order status
const updateOrderStatus = async (
  req,
  res
) => {
  try {
    const order =
      await Order.findByIdAndUpdate(
        req.params.id,

        {
          orderStatus:
            req.body
              .orderStatus,
        },

        {
          new: true,
        }
      );

    if (!order) {
      return res
        .status(404)
        .json({
          message:
            "Order not found",
        });
    }

    return res.json(
      order
    );
  } catch (err) {
    return res
      .status(500)
      .json({
        message:
          err.message,
      });
  }
};


module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};