const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

// Security headers
app.use(helmet());

// Sanitize MongoDB queries — prevents NoSQL injection
app.use(mongoSanitize());

//CORS
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      process.env.CLIENT_URL,
      process.env.ADMIN_URL,
    ].filter(Boolean);

    // Allow requests with no origin (Postman, curl)
    if (!origin) return callback(null, true);

    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Handle preflight requests
app.options("*", cors());


// Shiprocket includes a scan history in callbacks, so give its dedicated,
// token-protected endpoint a bounded larger parser before the general parser.
app.use("/api/shipping/webhook", express.json({ limit: "100kb" }), require("./routes/shiprocketWebhook.route"));

app.use(express.json({ limit: "10kb" })); // limit body size
app.use(express.urlencoded({ extended: true }));

// Rate limiting on auth routes — max 20 requests per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again later" },
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});

// Routes
app.use("/api/auth",     authLimiter, require("./routes/auth.route"));
app.use("/api/products", apiLimiter,  require("./routes/product.route"));
app.use("/api/orders",   apiLimiter,  require("./routes/order.route"));
app.use("/api/payment",  apiLimiter,  require("./routes/payment.route"));
app.use("/api/admin",    apiLimiter,  require("./routes/admin.route"));
app.use("/api/events", require("./routes/event.route"));
app.use("/api/custom-orders", require("./routes/customOrder.route"));
app.use("/api/admin/shiprocket", require("./routes/shiprocket.route"));

// Health check
app.get("/", (req, res) => res.json({ message: "CraftWorld API running ✅" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
