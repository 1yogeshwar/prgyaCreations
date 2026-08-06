const Order = require("../models/order.model");
const {
  createShipmentOrder, assignAWB, trackShipment
} = require("../services/shiprocket.service");

// POST /api/admin/shiprocket/ship/:orderId
const shipOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Step 1 — Create order in Shiprocket
    const srOrder = await createShipmentOrder(order);
    if (!srOrder.shipment_id) {
      return res.status(400).json({ message: "Shiprocket order creation failed", details: srOrder });
    }

    // Step 2 — Auto-assign courier + AWB
    const awbData = await assignAWB(srOrder.shipment_id);

    // Step 3 — Save to our order
    order.shiprocket = {
      orderId:     srOrder.order_id,
      shipmentId:  srOrder.shipment_id,
      awbCode:     awbData.response?.data?.awb_code || "",
      courierName: awbData.response?.data?.courier_name || "",
      trackingUrl: `https://shiprocket.co/tracking/${awbData.response?.data?.awb_code || ""}`,
      status:      "AWB Assigned",
    };
    order.orderStatus = "processing";
    await order.save();

    res.json({ message: "Shipment created successfully", order });
  } catch (err) {
    res.status(500).json({ message: err.response?.data?.message || err.message });
  }
};

// GET /api/admin/shiprocket/track/:orderId
const trackOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order?.shiprocket?.awbCode) {
      return res.status(400).json({ message: "No shipment found for this order" });
    }
    const tracking = await trackShipment(order.shiprocket.awbCode);
    res.json(tracking);
  } catch (err) {
    res.status(500).json({ message: err.response?.data?.message || err.message });
  }
};

module.exports = { shipOrder, trackOrder };