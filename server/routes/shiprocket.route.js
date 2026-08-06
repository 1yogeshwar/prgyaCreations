const router = require("express").Router();
const { shipOrder, trackOrder } = require("../controllers/shiprocket.controller");
const { protect, adminOnly } = require("../middleware/auth.middleware");

router.use(protect, adminOnly);

router.post("/ship/:orderId",   shipOrder);
router.get("/track/:orderId",   trackOrder);

module.exports = router;