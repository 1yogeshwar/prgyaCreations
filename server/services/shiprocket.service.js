const axios = require("axios");

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

let cachedToken = null;
let tokenExpiry = null;

// Get auth token (cached for 9 days — Shiprocket tokens last 10 days)
const getToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const res = await axios.post(`${SHIPROCKET_BASE}/auth/login`, {
    email:    process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });
  cachedToken = res.data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000; // 9 days
  return cachedToken;
};

// Create a shipment order in Shiprocket
const createShipmentOrder = async (order) => {
  const token = await getToken();

  const payload = {
    order_id:          order._id.toString(),
    order_date:        new Date(order.createdAt).toISOString().split("T")[0],
    pickup_location:   "Home", // must match your Shiprocket pickup address nickname
    billing_customer_name: order.shippingAddress.firstName,
    billing_last_name:     order.shippingAddress.lastName || "",
    billing_address:       order.shippingAddress.address,
    billing_city:           order.shippingAddress.city,
    billing_pincode:        order.shippingAddress.zip,
    billing_state:           order.shippingAddress.state,
    billing_country:         "India",
    billing_email:           order.guestEmail || "customer@pragyacreations.com",
    billing_phone:           order.phone,
    shipping_is_billing:     true,
    order_items: order.items.map(item => ({
      name:            item.name,
      sku:             item.product?.toString() || item.name,
      units:           item.quantity,
      selling_price:   item.price,
    })),
    payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
    sub_total:      order.subtotal,
    length: 10, breadth: 10, height: 5,   // default package dims in cm
    weight: 0.3,                           // default weight in kg
  };

  const res = await axios.post(
    `${SHIPROCKET_BASE}/orders/create/adhoc`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

// Assign AWB (courier) automatically
const assignAWB = async (shipmentId) => {
  const token = await getToken();
  const res = await axios.post(
    `${SHIPROCKET_BASE}/courier/assign/awb`,
    { shipment_id: shipmentId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

// Track shipment by AWB
const trackShipment = async (awbCode) => {
  const token = await getToken();
  const res = await axios.get(
    `${SHIPROCKET_BASE}/courier/track/awb/${awbCode}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

module.exports = { getToken, createShipmentOrder, assignAWB, trackShipment };