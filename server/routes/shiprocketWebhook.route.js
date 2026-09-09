const router = require("express").Router();
const { shiprocketWebhook } = require("../controllers/shiprocket.controller");

// Mounted at /api/shipping/webhook, deliberately separate from the admin-only
// Shiprocket routes: Shiprocket authenticates this server-to-server callback
// with x-api-key.
router.post("/", shiprocketWebhook);

module.exports = router;
