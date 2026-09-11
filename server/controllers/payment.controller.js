const crypto =
  require("crypto");

const Order =
  require("../models/order.model");

const Product =
  require("../models/product.model");

const MINIMUM_ORDER_AMOUNT = 500;


const getRazorpay = () => {
  const Razorpay =
    require("razorpay");

  return new Razorpay({
    key_id:
      process.env
        .RAZORPAY_KEY_ID,

    key_secret:
      process.env
        .RAZORPAY_KEY_SECRET,
  });
};


// POST /api/payment/create-order
const createPaymentOrder =
  async (req, res) => {
    try {
      const {
        items,
      } = req.body;

      if (
        !items ||
        !Array.isArray(
          items
        ) ||
        items.length === 0
      ) {
        return res
          .status(400)
          .json({
            message:
              "No items provided",
          });
      }

      /*
       * Validate request items.
       */
      for (
        const item of items
      ) {
        const quantity =
          Number(
            item.quantity
          );

        if (
          !item.product ||
          !Number.isInteger(
            quantity
          ) ||
          quantity < 1
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid product or quantity",
            });
        }
      }

      const productIds = [
        ...new Set(
          items.map(
            (item) =>
              String(
                item.product
              )
          )
        ),
      ];

      /*
       * Fetch actual products
       * and prices from MongoDB.
       */
      const dbProducts =
        await Product.find({
          _id: {
            $in:
              productIds,
          },
        });

      const validatedItems =
        items.map(
          (item) => {
            const product =
              dbProducts.find(
                (
                  dbProduct
                ) =>
                  dbProduct._id.toString() ===
                  String(
                    item.product
                  )
              );

            if (!product) {
              throw new Error(
                `Product not found: ${item.product}`
              );
            }

            const quantity =
              Number(
                item.quantity
              );

            if (
              product.stock <
              quantity
            ) {
              throw new Error(
                `Not enough stock for: ${product.name}`
              );
            }

            return {
              price:
                product.price,

              quantity,
            };
          }
        );

      /*
       * Calculate actual subtotal.
       */
      const subtotal =
        validatedItems.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.price
            ) *
              item.quantity,

          0
        );

      /*
       * Minimum order check.
       */
      if (
        subtotal <
        MINIMUM_ORDER_AMOUNT
      ) {
        return res
          .status(400)
          .json({
            message:
              "Minimum order value is ₹500",
          });
      }

      /*
       * Current business rules.
       */
      const shipping = 0;
      const tax = 0;

      const total =
        subtotal;

      if (total <= 0) {
        return res
          .status(400)
          .json({
            message:
              "Invalid order amount",
          });
      }

      /*
       * Razorpay accepts INR
       * amount in paise.
       *
       * ₹500 => 50000 paise.
       */
      const amountInPaise =
        Math.round(
          total * 100
        );

      const razorpay =
        getRazorpay();

      const options = {
        amount:
          amountInPaise,

        currency:
          "INR",

        receipt:
          `receipt_${Date.now()}`,
      };

      const razorpayOrder =
        await razorpay.orders.create(
          options
        );

      return res.json({
        orderId:
          razorpayOrder.id,

        amount:
          razorpayOrder.amount,

        currency:
          razorpayOrder.currency,

        key:
          process.env
            .RAZORPAY_KEY_ID,
      });
    } catch (err) {
      console.error(
        "Create Razorpay order error:",
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


// POST /api/payment/verify
const verifyPayment =
  async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId,
      } = req.body;

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !orderId
      ) {
        return res
          .status(400)
          .json({
            message:
              "Incomplete Razorpay payment verification data",
          });
      }

      /*
       * Verify Razorpay signature.
       */
      const body =
        `${razorpay_order_id}|${razorpay_payment_id}`;

      const expectedSig =
        crypto
          .createHmac(
            "sha256",

            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(body)
          .digest("hex");

      if (
        expectedSig !==
        razorpay_signature
      ) {
        return res
          .status(400)
          .json({
            message:
              "Payment verification failed",
          });
      }

      /*
       * Find our MongoDB order.
       */
      const order =
        await Order.findById(
          orderId
        ).select(
          "paymentMethod paymentStatus paymentId razorpayOrderId"
        );

      if (!order) {
        return res
          .status(404)
          .json({
            message:
              "Order not found",
          });
      }

      if (
        order.paymentMethod !==
        "online"
      ) {
        return res
          .status(409)
          .json({
            message:
              "This order is not an online payment order",
          });
      }

      /*
       * Make sure Razorpay payment
       * belongs to the same customer
       * order saved in MongoDB.
       */
      if (
        !order.razorpayOrderId ||
        order.razorpayOrderId !==
          razorpay_order_id
      ) {
        return res
          .status(409)
          .json({
            message:
              "Razorpay payment does not match this customer order",
          });
      }

      /*
       * Idempotency:
       * already-paid same payment
       * is okay.
       */
      if (
        order.paymentStatus ===
        "paid"
      ) {
        if (
          order.paymentId ===
          razorpay_payment_id
        ) {
          return res.json({
            success: true,

            paymentId:
              razorpay_payment_id,
          });
        }

        return res
          .status(409)
          .json({
            message:
              "A different Razorpay payment is already recorded for this order",
          });
      }

      /*
       * Mark as paid once.
       */
      const updatedOrder =
        await Order.findOneAndUpdate(
          {
            _id:
              orderId,

            paymentStatus: {
              $ne:
                "paid",
            },
          },

          {
            paymentStatus:
              "paid",

            paymentId:
              razorpay_payment_id,
          },

          {
            new: true,
          }
        );

      if (!updatedOrder) {
        return res
          .status(409)
          .json({
            message:
              "Payment status changed while verification was processing",
          });
      }

      return res.json({
        success: true,

        paymentId:
          razorpay_payment_id,
      });
    } catch (err) {
      console.error(
        "Verify payment error:",
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


module.exports = {
  createPaymentOrder,
  verifyPayment,
};