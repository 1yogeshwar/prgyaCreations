const router = require("express").Router();
const { shipOrder, retryAssignAWB, trackOrder } = require("../controllers/shiprocket.controller");
const { protect, adminOnly } = require("../middleware/auth.middleware");

router.use(protect, adminOnly);

router.post("/ship/:orderId",      shipOrder);
router.post("/retry-awb/:orderId", retryAssignAWB);
router.get("/track/:orderId",      trackOrder);

module.exports = router;