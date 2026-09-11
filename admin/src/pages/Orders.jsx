

import { Fragment, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("admin-token")}` });
const STATUS = ["pending", "processing", "shipped", "delivered", "cancelled"];
const FULFILLMENT_LOCK_MAX_AGE_MS = 15 * 60 * 1000;

const SHIPPING_STATUS_LABELS = {
  ORDER_CONFIRMED: "Order confirmed",
  SHIPMENT_CREATED: "Shipment created",
  AWB_ASSIGNED: "AWB assigned",
  PICKUP_SCHEDULED: "Pickup scheduled",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Delivery failed",
  RTO: "Return to origin",
  SHIPPING_ACTION_REQUIRED: "Shipping action required",
};

const firstText = (...values) => {
  const value = values.find(candidate =>
    (typeof candidate === "string" || typeof candidate === "number") && String(candidate).trim()
  );
  return value === undefined ? "" : String(value).trim();
};

const friendlyShippingStatus = (status, fallback = "Not started") => {
  const rawStatus = firstText(status);
  if (!rawStatus) return fallback;

  const normalized = rawStatus.toUpperCase().replace(/[\s-]+/g, "_");
  if (SHIPPING_STATUS_LABELS[normalized]) return SHIPPING_STATUS_LABELS[normalized];

  return rawStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

const shipmentDetails = (order, localFailure = "") => {
  const shiprocket = order?.shiprocket || {};
  const shipping = order?.shippingDetails || order?.shippingInfo || {};
  const rawStatus = firstText(
    shiprocket.shippingStatus,
    shiprocket.status,
    shipping.status,
    order?.shippingStatus
  );
  const normalizedStatus = rawStatus.toUpperCase().replace(/[\s-]+/g, "_");
  const failureReason = firstText(
    localFailure,
    shiprocket.failureReason,
    shiprocket.errorReason,
    shiprocket.lastError,
    shiprocket.error,
    shipping.failureReason,
    shipping.errorReason,
    shipping.lastError,
    order?.shippingFailureReason
  );
  const automationState = firstText(
    shiprocket.automationState,
    shipping.automationState,
    shiprocket.automationStatus,
    shiprocket.syncStatus,
    shipping.automationStatus,
    shipping.syncStatus
  ).toUpperCase();
  const lockAcquiredAt = firstText(shiprocket.lockAcquiredAt);
  const lockAcquiredAtMs = Date.parse(lockAcquiredAt);
  const staleInProgress = automationState === "IN_PROGRESS" &&
    Number.isFinite(lockAcquiredAtMs) &&
    Date.now() - lockAcquiredAtMs >= FULFILLMENT_LOCK_MAX_AGE_MS;
  const displayFailureReason = failureReason || (staleInProgress
    ? "The previous fulfillment request appears stalled. Retry to resume it safely."
    : "");
  const failed = Boolean(displayFailureReason) ||
    ["DELIVERY_FAILED", "SHIPPING_ACTION_REQUIRED", "FAILED", "ERROR"].includes(normalizedStatus) ||
    ["ACTION_REQUIRED", "PENDING_RETRY", "FAILED", "ERROR"].includes(automationState);

  const awbCode = firstText(shiprocket.awbCode, shiprocket.awb, shipping.awbCode, shipping.awb);
  const shipmentId = firstText(shiprocket.shipmentId, shiprocket.shipment_id, shipping.shipmentId, shipping.shipment_id);
  const shiprocketOrderId = firstText(shiprocket.orderId, shiprocket.order_id, shipping.orderId, shipping.order_id);
  const pickupStatus = firstText(
    shiprocket.pickupStatus,
    shiprocket.pickup?.status,
    shipping.pickupStatus,
    shipping.pickup?.status,
    shiprocket.pickupScheduled ? "Scheduled" : "",
    shipping.pickupScheduled ? "Scheduled" : ""
  ) || "Not scheduled";
  const pickupScheduled = ["SCHEDULED", "PICKUP_SCHEDULED"].includes(
    pickupStatus.toUpperCase().replace(/[\s-]+/g, "_")
  );
  const hasShipment = Boolean(awbCode || shipmentId || shiprocketOrderId || automationState === "COMPLETED");

  return {
    awbCode,
    shipmentId,
    shiprocketOrderId,
    courierName: firstText(shiprocket.courierName, shiprocket.courier, shipping.courierName, shipping.courier),
    pickupStatus,
    trackingUrl: firstText(shiprocket.trackingUrl, shiprocket.tracking_url, shipping.trackingUrl, shipping.tracking_url),
    status: friendlyShippingStatus(rawStatus, failed ? "Shipping action required" : "Shipment created"),
    failureReason: displayFailureReason,
    failed,
    processing: automationState === "IN_PROGRESS" && !staleInProgress,
    hasShipment,
    needsResume: !failed && hasShipment && (!awbCode || !pickupScheduled),
  };
};

const ShiprocketSection = ({ order, isProcessing, localFailure, onShip }) => {
  const shipment = shipmentDetails(order, localFailure);
  const buttonStyle = {
    ...smallBtnStyle,
    padding: "8px 16px",
    fontSize: 13,
  };

  return (
    <div style={{ marginTop: 16, ...cardStyle }}>
      <p style={cardLabel}>🚚 Shipping via Shiprocket</p>

      {isProcessing || shipment.processing ? (
        <button
          disabled
          style={{ ...buttonStyle, background: "#94a3b8", cursor: "not-allowed" }}
        >
          Processing shipment...
        </button>
      ) : shipment.failed ? (
        <div>
          <p style={{ fontSize: 13, color: "#b91c1c", marginBottom: 6, fontWeight: 600 }}>
            Shipping needs attention
          </p>
          <p style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 10 }}>
            {shipment.failureReason || "Shiprocket requires manual action before this shipment can continue."}
          </p>
          <button
            onClick={(event) => { event.stopPropagation(); onShip(order._id); }}
            style={{ ...buttonStyle, background: "#dc2626" }}
          >
            Retry Shiprocket
          </button>
        </div>
      ) : shipment.hasShipment ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Courier</p>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{shipment.courierName || "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>AWB</p>
            <p style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{shipment.awbCode || "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Pickup status</p>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: "#fef3c7", color: "#92400e" }}>
              {friendlyShippingStatus(shipment.pickupStatus, "Not scheduled")}
            </span>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Shipping status</p>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: "#cffafe", color: "#0e7490" }}>
              {shipment.status}
            </span>
          </div>
          {shipment.trackingUrl && (
            <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer"
              style={{ ...buttonStyle, background: "#0891b2", textDecoration: "none", display: "inline-block" }}>
              Track Shipment →
            </a>
          )}
          {shipment.needsResume && (
            <button
              onClick={(event) => { event.stopPropagation(); onShip(order._id); }}
              style={{ ...buttonStyle, background: "#0891b2" }}
            >
              Resume Shiprocket
            </button>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
            This order has not been shipped yet. Create a Shiprocket shipment and assign a courier.
          </p>
          <button
            onClick={(event) => { event.stopPropagation(); onShip(order._id); }}
            style={{ ...buttonStyle, background: "#0891b2" }}
          >
            📦 Ship via Shiprocket
          </button>
        </div>
      )}
    </div>
  );
};

const paymentStatusStyle = (paymentStatus) => ({
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
  background: paymentStatus === "paid"
    ? "#d1fae5"
    : paymentStatus === "awaiting_confirmation"
      ? "#fef3c7"
      : paymentStatus === "failed"
        ? "#fee2e2"
        : "#f3f4f6",
  color: paymentStatus === "paid"
    ? "#065f46"
    : paymentStatus === "awaiting_confirmation"
      ? "#92400e"
      : paymentStatus === "failed"
        ? "#991b1b"
        : "#374151",
});

const paymentMethodLabel = (method) => {
  if (method === "cod") return "💵 COD";
  if (method === "phone_confirm") return "📞 Phone";
  if (method === "online") return "💳 Online";
  return "";
};

const OrderDetails = ({ order, isProcessing, localFailure, onShip, onCopyToken }) => (
  <>
    <div className="order-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, paddingTop: 16 }}>
      <div style={cardStyle}>
        <p style={cardLabel}>📦 Tracking Token</p>
        <p style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "#4c1d95", marginBottom: 8 }}>
          {order.trackingToken || "—"}
        </p>
        {order.trackingToken && (
          <button onClick={() => onCopyToken(order.trackingToken)} style={smallBtnStyle}>
            Copy Token
          </button>
        )}
      </div>

      <div style={cardStyle}>
        <p style={cardLabel}>📍 Shipping Address</p>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#374151" }}>
          {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}<br />
          {order.shippingAddress?.address}<br />
          {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}
        </p>
      </div>

      <div style={cardStyle}>
        <p style={cardLabel}>🛍 Items ({order.items?.length})</p>
        {order.items?.map((item, index) => (
          <div className="order-item-row" key={index} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, marginBottom: 4 }}>
            <span>{item.name} × {item.quantity}</span>
            <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid #e9d5ff", marginTop: 8, paddingTop: 8, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
            <span>Subtotal</span><span>₹{order.subtotal}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
            <span>Shipping</span><span>{order.shipping === 0 ? "Free" : `₹${order.shipping}`}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
            <span>Tax</span><span>₹{order.tax}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 4 }}>
            <span>Total</span><span>₹{order.total}</span>
          </div>
        </div>
      </div>
    </div>

    <ShiprocketSection
      order={order}
      isProcessing={isProcessing}
      localFailure={localFailure}
      onShip={onShip}
    />

    {order.paymentMethod === "phone_confirm" && order.paymentStatus !== "paid" && (
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef3c7", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
        📞 <strong>Action needed:</strong> Call customer at <strong>{order.phone}</strong> to confirm payment. Share tracking token after confirmation.
      </div>
    )}
    {order.paymentMethod === "cod" && (
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#ecfdf5", borderRadius: 8, fontSize: 13, color: "#065f46" }}>
        💵 <strong>COD Order:</strong> Collect ₹{order.total} at delivery from {order.shippingAddress?.firstName}.
      </div>
    )}
  </>
);

const MobileOrderCard = ({ order, expanded, isShipping, localFailure, onToggle, onUpdateStatus, onShip, onCopyToken }) => {
  const shipment = shipmentDetails(order, localFailure);
  const paymentLabel = order.paymentStatus === "awaiting_confirmation" ? "awaiting" : order.paymentStatus;

  return (
    <article className={`order-mobile-card${expanded ? " order-mobile-card--expanded" : ""}`}>
      <div
        className="order-mobile-card__summary"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`order-details-${order._id}`}
        onClick={onToggle}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="order-mobile-card__top">
          <span className="order-mobile-card__id">#{order._id.slice(-6).toUpperCase()}</span>
          <span aria-hidden="true" style={{ color: "#9ca3af", fontSize: 17 }}>{expanded ? "⌃" : "⌄"}</span>
        </div>
        <p className="order-mobile-card__customer">{order.user?.name || "Guest"}</p>
        <p className="order-mobile-card__email">{order.guestEmail || order.user?.email || "—"}</p>
        <div className="order-mobile-card__amount-row">
          <span className="order-mobile-card__amount">₹{order.total}</span>
          <span className="order-mobile-card__payment-method">{paymentMethodLabel(order.paymentMethod)}</span>
        </div>
        <div className="order-mobile-card__status-row">
          <span style={paymentStatusStyle(order.paymentStatus)}>{paymentLabel}</span>
          <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, background: "#e0e7ff", color: "#3730a3" }}>
            {order.orderStatus}
          </span>
          {shipment.hasShipment && (
            <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, background: "#cffafe", color: "#0e7490" }}>
              {shipment.status}
            </span>
          )}
        </div>
      </div>

      <div className="order-mobile-card__select-row" onClick={event => event.stopPropagation()}>
        <label htmlFor={`order-status-${order._id}`}>Update status</label>
        <select
          id={`order-status-${order._id}`}
          value={order.orderStatus}
          onChange={event => onUpdateStatus(order._id, event.target.value)}
        >
          {STATUS.map(status => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      {expanded && (
        <div id={`order-details-${order._id}`} className="order-mobile-card__details">
          <OrderDetails
            order={order}
            isProcessing={isShipping}
            localFailure={localFailure}
            onShip={onShip}
            onCopyToken={onCopyToken}
          />
        </div>
      )}
    </article>
  );
};

export default function Orders() {
  const [orders, setOrders]     = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [shipping, setShipping] = useState(null); // track which order is being shipped
  const [shippingErrors, setShippingErrors] = useState({});

  const load = () =>
    axios.get(`${API}/admin/orders`, { headers: authHeader() }).then(r => setOrders(r.data));

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, orderStatus) => {
    await axios.put(`${API}/admin/orders/${id}`, { orderStatus }, { headers: authHeader() });
    toast.success("Status updated!");
    load();
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    toast.success("Tracking token copied!");
  };

  const shipViaShiprocket = async (orderId) => {
    setShipping(orderId);
    try {
      const response = await axios.post(
        `${API}/admin/shiprocket/ship/${orderId}`,
        {},
        { headers: authHeader() }
      );
      const updatedOrder = response.data?.order || response.data?.result?.order || response.data?.result;

      if (updatedOrder?._id) {
        setOrders(currentOrders => currentOrders.map(order =>
          order._id === updatedOrder._id
            ? { ...order, ...updatedOrder, shiprocket: { ...order.shiprocket, ...updatedOrder.shiprocket } }
            : order
        ));
      }
      setShippingErrors(currentErrors => {
        const { [orderId]: _ignored, ...remainingErrors } = currentErrors;
        return remainingErrors;
      });
      toast.success("Shipment created on Shiprocket! 📦");
    } catch (err) {
      const failureReason = firstText(
        err.response?.data?.failureReason,
        err.response?.data?.reason,
        err.response?.data?.error?.message,
        err.response?.data?.details?.message,
        err.response?.data?.message,
        err.message
      ) || "Shipping failed. Please try again.";
      setShippingErrors(currentErrors => ({ ...currentErrors, [orderId]: failureReason }));
      toast.error(failureReason);
    } finally {
      setShipping(null);
      try {
        await load();
      } catch {
        toast.error("Shipment request finished, but the order list could not be refreshed.");
      }
    }
  };

  return (
    <div className="admin-page orders-page">
      <h2 className="admin-page-title" style={{ marginBottom: 8 }}>Orders</h2>
      <p className="orders-page-intro" style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
        Click any row to expand full details including tracking token.
      </p>

      <div className="desktop-only orders-table-wrap" style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f3f4f6" }}>
            <tr>
              {["Order ID", "Customer", "Phone", "Total", "Payment", "Order Status", "Update Status"].map(header => (
                <th key={header} style={thStyle}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <Fragment key={order._id}>
                <tr
                  onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    background: expanded === order._id ? "#faf5ff" : "white",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      #{order._id.slice(-6).toUpperCase()}
                    </span>
                    {shipmentDetails(order, shippingErrors[order._id]).awbCode && (
                      <div style={{ fontSize: 10, color: "#0891b2", marginTop: 2 }}>📦 Shipped</div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{order.user?.name || "Guest"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{order.guestEmail || order.user?.email || "—"}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "monospace", fontSize: 13 }}>{order.phone || "—"}</span>
                  </td>
                  <td style={tdStyle}>
                    <strong>₹{order.total}</strong>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{paymentMethodLabel(order.paymentMethod)}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={paymentStatusStyle(order.paymentStatus)}>
                      {order.paymentStatus === "awaiting_confirmation" ? "awaiting" : order.paymentStatus}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, background: "#e0e7ff", color: "#3730a3" }}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td style={tdStyle} onClick={event => event.stopPropagation()}>
                    <select
                      value={order.orderStatus}
                      onChange={event => updateStatus(order._id, event.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
                    >
                      {STATUS.map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                </tr>
                {expanded === order._id && (
                  <tr>
                    <td colSpan={7} style={{ background: "#faf5ff", padding: "0 16px 16px 16px", borderBottom: "2px solid #e9d5ff" }}>
                      <OrderDetails
                        order={order}
                        isProcessing={shipping === order._id}
                        localFailure={shippingErrors[order._id]}
                        onShip={shipViaShiprocket}
                        onCopyToken={copyToken}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>No orders yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mobile-only orders-mobile-list" aria-label="Orders">
        {orders.map(order => (
          <MobileOrderCard
            key={order._id}
            order={order}
            expanded={expanded === order._id}
            isShipping={shipping === order._id}
            localFailure={shippingErrors[order._id]}
            onToggle={() => setExpanded(expanded === order._id ? null : order._id)}
            onUpdateStatus={updateStatus}
            onShip={shipViaShiprocket}
            onCopyToken={copyToken}
          />
        ))}
        {orders.length === 0 && <p className="users-mobile-empty">No orders yet</p>}
      </div>
    </div>
  );
}

const thStyle  = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" };
const tdStyle  = { padding: "12px 16px", fontSize: 14, color: "#374151", verticalAlign: "middle" };
const cardStyle = { background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e9d5ff" };
const cardLabel = { fontSize: 12, fontWeight: 700, color: "#7c3aed", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" };
const smallBtnStyle = { padding: "5px 12px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" };
