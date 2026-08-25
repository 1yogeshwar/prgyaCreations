// const Order = require("../models/order.model");
// const {
//   createShipmentOrder, assignAWB, trackShipment
// } = require("../services/shiprocket.service");

// const shipOrder = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.orderId);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     const srOrder = await createShipmentOrder(order);
    
//     // Log full response for debugging
//     console.log("Shiprocket order response:", JSON.stringify(srOrder));

//     if (!srOrder.shipment_id) {
//       return res.status(400).json({ 
//         message: "Shiprocket order creation failed", 
//         details: srOrder  // ← full error details
//       });
//     }

//     const awbData = await assignAWB(srOrder.shipment_id);
//     console.log("AWB assign response:", JSON.stringify(awbData));

//     order.shiprocket = {
//       orderId:     srOrder.order_id,
//       shipmentId:  srOrder.shipment_id,
//       awbCode:     awbData.response?.data?.awb_code || "",
//       courierName: awbData.response?.data?.courier_name || "",
//       trackingUrl: `https://shiprocket.co/tracking/${awbData.response?.data?.awb_code || ""}`,
//       status:      "AWB Assigned",
//     };
//     order.orderStatus = "processing";
//     await order.save();

//     res.json({ message: "Shipment created successfully", order });
//   } catch (err) {
//     console.error("Shiprocket ship error:", err.response?.data || err.message);
//     res.status(500).json({ 
//       message: err.response?.data?.message || err.message,
//       details: err.response?.data 
//     });
//   }
// };

// // GET /api/admin/shiprocket/track/:orderId
// const trackOrder = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.orderId);
//     if (!order?.shiprocket?.awbCode) {
//       return res.status(400).json({ message: "No shipment found for this order" });
//     }
//     const tracking = await trackShipment(order.shiprocket.awbCode);
//     res.json(tracking);
//   } catch (err) {
//     res.status(500).json({ message: err.response?.data?.message || err.message });
//   }
// };

// module.exports = { shipOrder, trackOrder };

const Order = require("../models/order.model");
const {
  createShipmentOrder, assignAWB, trackShipment
} = require("../services/shiprocket.service");

const shipOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Step 1 — Create shipment order
    const srOrder = await createShipmentOrder(order);
    console.log("Shiprocket createOrder response:", JSON.stringify(srOrder));

    if (!srOrder.shipment_id) {
      return res.status(400).json({
        message: "Shiprocket order creation failed",
        details: srOrder,
      });
    }

    // Save shipment_id immediately — order IS created even if AWB fails next
    order.shiprocket = {
      ...order.shiprocket,
      orderId:    srOrder.order_id,
      shipmentId: srOrder.shipment_id,
      status:     "Shipment Created — Assigning Courier",
    };
    order.orderStatus = "processing";
    await order.save();

    // Step 2 — Try to assign courier/AWB
    const awbData = await assignAWB(srOrder.shipment_id);
    console.log("Shiprocket assignAWB response:", JSON.stringify(awbData));

    // ✅ Check the actual success flag, not just "no exception"
    if (awbData.awb_assign_status !== 1 || !awbData.response?.data?.awb_code) {
      return res.status(200).json({
        message: "Shipment created, but courier assignment failed. You can retry.",
        order,
        awbError: awbData.response?.data || awbData,
      });
    }

    // Step 3 — Full success, save AWB details
    order.shiprocket.awbCode     = awbData.response.data.awb_code;
    order.shiprocket.courierName = awbData.response.data.courier_name || "";
    order.shiprocket.trackingUrl = `https://shiprocket.co/tracking/${awbData.response.data.awb_code}`;
    order.shiprocket.status      = "AWB Assigned";
    await order.save();

    res.json({ message: "Shipment created and courier assigned successfully!", order });
  } catch (err) {
    console.error("Shiprocket ship error:", err.response?.data || err.message);
    res.status(500).json({
      message: err.response?.data?.message || err.message,
      details: err.response?.data,
    });
  }
};

// New — retry AWB assignment without recreating the order
const retryAssignAWB = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order?.shiprocket?.shipmentId) {
      return res.status(400).json({ message: "No Shiprocket shipment exists for this order yet" });
    }

    const awbData = await assignAWB(order.shiprocket.shipmentId);
    console.log("Retry assignAWB response:", JSON.stringify(awbData));

    if (awbData.awb_assign_status !== 1 || !awbData.response?.data?.awb_code) {
      return res.status(400).json({
        message: "Courier assignment still failing",
        details: awbData.response?.data || awbData,
      });
    }

    order.shiprocket.awbCode     = awbData.response.data.awb_code;
    order.shiprocket.courierName = awbData.response.data.courier_name || "";
    order.shiprocket.trackingUrl = `https://shiprocket.co/tracking/${awbData.response.data.awb_code}`;
    order.shiprocket.status      = "AWB Assigned";
    await order.save();

    res.json({ message: "Courier assigned successfully!", order });
  } catch (err) {
    res.status(500).json({ message: err.response?.data?.message || err.message });
  }
};

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

module.exports = { shipOrder, retryAssignAWB, trackOrder };




