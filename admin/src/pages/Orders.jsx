// import { useEffect, useState } from "react";
// import axios from "axios";
// import { toast } from "sonner";

// const API = process.env.REACT_APP_API_URL;
// const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("admin-token")}` });
// const STATUS = ["pending", "processing", "shipped", "delivered", "cancelled"];

// export default function Orders() {
//   const [orders, setOrders]     = useState([]);
//   const [expanded, setExpanded] = useState(null); // which row is expanded

//   const load = () =>
//     axios.get(`${API}/admin/orders`, { headers: authHeader() }).then(r => setOrders(r.data));

//   useEffect(() => { load(); }, []);

//   const updateStatus = async (id, orderStatus) => {
//     await axios.put(`${API}/admin/orders/${id}`, { orderStatus }, { headers: authHeader() });
//     toast.success("Status updated!");
//     load();
//   };

//   const copyToken = (token) => {
//     navigator.clipboard.writeText(token);
//     toast.success("Tracking token copied!");
//   };

//   return (
//     <div>
//       <h2 style={{ marginBottom: 8 }}>Orders</h2>
//       <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
//         Click any row to expand full details including tracking token.
//       </p>

//       <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
//         <table style={{ width: "100%", borderCollapse: "collapse" }}>
//           <thead style={{ background: "#f3f4f6" }}>
//             <tr>
//               {["Order ID", "Customer", "Phone", "Total", "Payment", "Order Status", "Update Status"].map(h => (
//                 <th key={h} style={thStyle}>{h}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {orders.map(o => (
//               <>
//                 {/* Main Row */}
//                 <tr
//                   key={o._id}
//                   onClick={() => setExpanded(expanded === o._id ? null : o._id)}
//                   style={{
//                     borderBottom: "1px solid #f3f4f6",
//                     cursor: "pointer",
//                     background: expanded === o._id ? "#faf5ff" : "white",
//                     transition: "background 0.15s",
//                   }}
//                 >
//                   <td style={tdStyle}>
//                     <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
//                       #{o._id.slice(-6).toUpperCase()}
//                     </span>
//                   </td>

//                   <td style={tdStyle}>
//                     <div style={{ fontWeight: 500 }}>{o.user?.name || "Guest"}</div>
//                     <div style={{ fontSize: 12, color: "#6b7280" }}>{o.guestEmail || o.user?.email || "—"}</div>
//                   </td>

//                   <td style={tdStyle}>
//                     <span style={{ fontFamily: "monospace", fontSize: 13 }}>
//                       {o.phone || "—"}
//                     </span>
//                   </td>

//                   <td style={tdStyle}>
//                     <strong>₹{o.total}</strong>
//                     <div style={{ fontSize: 11, color: "#6b7280" }}>
//                       {o.paymentMethod === "cod"           && "💵 COD"}
//                       {o.paymentMethod === "phone_confirm" && "📞 Phone"}
//                       {o.paymentMethod === "online"        && "💳 Online"}
//                     </div>
//                   </td>

//                   <td style={tdStyle}>
//                     <span style={{
//                       padding: "4px 10px", borderRadius: 20, fontSize: 12,
//                       background: o.paymentStatus === "paid"                  ? "#d1fae5"
//                                 : o.paymentStatus === "awaiting_confirmation" ? "#fef3c7"
//                                 : o.paymentStatus === "failed"                ? "#fee2e2"
//                                 : "#f3f4f6",
//                       color:     o.paymentStatus === "paid"                  ? "#065f46"
//                                 : o.paymentStatus === "awaiting_confirmation" ? "#92400e"
//                                 : o.paymentStatus === "failed"                ? "#991b1b"
//                                 : "#374151",
//                     }}>
//                       {o.paymentStatus === "awaiting_confirmation" ? "awaiting" : o.paymentStatus}
//                     </span>
//                   </td>

//                   <td style={tdStyle}>
//                     <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, background: "#e0e7ff", color: "#3730a3" }}>
//                       {o.orderStatus}
//                     </span>
//                   </td>

//                   <td style={tdStyle} onClick={e => e.stopPropagation()}>
//                     <select
//                       value={o.orderStatus}
//                       onChange={e => updateStatus(o._id, e.target.value)}
//                       style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
//                     >
//                       {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
//                     </select>
//                   </td>
//                 </tr>

//                 {/* Expanded Detail Row */}
//                 {expanded === o._id && (
//                   <tr key={`${o._id}-expanded`}>
//                     <td colSpan={7} style={{ background: "#faf5ff", padding: "0 16px 16px 16px", borderBottom: "2px solid #e9d5ff" }}>
//                       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, paddingTop: 16 }}>

//                         {/* Tracking Token */}
//                         <div style={cardStyle}>
//                           <p style={cardLabel}>📦 Tracking Token</p>
//                           <p style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "#4c1d95", marginBottom: 8 }}>
//                             {o.trackingToken || "—"}
//                           </p>
//                           {o.trackingToken && (
//                             <button onClick={() => copyToken(o.trackingToken)} style={smallBtnStyle}>
//                               Copy Token
//                             </button>
//                           )}
//                         </div>

//                         {/* Shipping Address */}
//                         <div style={cardStyle}>
//                           <p style={cardLabel}>📍 Shipping Address</p>
//                           <p style={{ fontSize: 13, lineHeight: 1.6, color: "#374151" }}>
//                             {o.shippingAddress?.firstName} {o.shippingAddress?.lastName}<br />
//                             {o.shippingAddress?.address}<br />
//                             {o.shippingAddress?.city}, {o.shippingAddress?.state} {o.shippingAddress?.zip}
//                           </p>
//                         </div>

//                         {/* Order Items */}
//                         <div style={cardStyle}>
//                           <p style={cardLabel}>🛍 Items ({o.items?.length})</p>
//                           {o.items?.map((item, i) => (
//                             <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
//                               <span>{item.name} × {item.quantity}</span>
//                               <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
//                             </div>
//                           ))}
//                           <div style={{ borderTop: "1px solid #e9d5ff", marginTop: 8, paddingTop: 8, fontSize: 13 }}>
//                             <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
//                               <span>Subtotal</span><span>₹{o.subtotal}</span>
//                             </div>
//                             <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
//                               <span>Shipping</span><span>{o.shipping === 0 ? "Free" : `₹${o.shipping}`}</span>
//                             </div>
//                             <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
//                               <span>Tax</span><span>₹{o.tax}</span>
//                             </div>
//                             <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 4 }}>
//                               <span>Total</span><span>₹{o.total}</span>
//                             </div>
//                           </div>
//                         </div>

//                       </div>

//                       {/* Phone confirm note */}
//                       {o.paymentMethod === "phone_confirm" && o.paymentStatus !== "paid" && (
//                         <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef3c7", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
//                           📞 <strong>Action needed:</strong> Call customer at <strong>{o.phone}</strong> to confirm payment. Share tracking token after confirmation.
//                         </div>
//                       )}
//                       {o.paymentMethod === "cod" && (
//                         <div style={{ marginTop: 12, padding: "10px 14px", background: "#ecfdf5", borderRadius: 8, fontSize: 13, color: "#065f46" }}>
//                           💵 <strong>COD Order:</strong> Collect ₹{o.total} at delivery from {o.shippingAddress?.firstName}.
//                         </div>
//                       )}
//                     </td>
//                   </tr>
//                 )}
//               </>
//             ))}
//             {orders.length === 0 && (
//               <tr>
//                 <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
//                   No orders yet
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// const thStyle  = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" };
// const tdStyle  = { padding: "12px 16px", fontSize: 14, color: "#374151", verticalAlign: "middle" };
// const cardStyle = { background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e9d5ff" };
// const cardLabel = { fontSize: 12, fontWeight: 700, color: "#7c3aed", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" };
// const smallBtnStyle = { padding: "5px 12px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" };


import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("admin-token")}` });
const STATUS = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function Orders() {
  const [orders, setOrders]     = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [shipping, setShipping] = useState(null); // track which order is being shipped

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

  // const shipViaShiprocket = async (orderId) => {
  //   setShipping(orderId);
  //   try {
  //     await axios.post(`${API}/admin/shiprocket/ship/${orderId}`, {}, { headers: authHeader() });
  //     toast.success("Shipment created on Shiprocket! 📦");
  //     load();
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || "Shipping failed");
  //   } finally {
  //     setShipping(null);
  //   }
  // };
const shipViaShiprocket = async (orderId) => {
  setShipping(orderId);
  try {
    await axios.post(`${API}/admin/shiprocket/ship/${orderId}`, {}, { headers: authHeader() });
    toast.success("Shipment created on Shiprocket! 📦");
    load();
  } catch (err) {
    // Show detailed error instead of generic message
    const errorMsg = err.response?.data?.message || "Shipping failed";
    const details = err.response?.data?.details;
    console.error("Full error:", details);
    toast.error(`${errorMsg}${details ? " — check console" : ""}`);
  } finally {
    setShipping(null);
  }
};

 const retryAWB = async (orderId) => {
  setShipping(orderId);
  try {
    await axios.post(`${API}/admin/shiprocket/retry-awb/${orderId}`, {}, { headers: authHeader() });
    toast.success("Courier assigned successfully! 🚚");
    load();
  } catch (err) {
    toast.error(err.response?.data?.message || "Retry failed");
    console.error("Retry error details:", err.response?.data?.details);
  } finally {
    setShipping(null);
  }
};
  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>Orders</h2>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
        Click any row to expand full details including tracking token.
      </p>

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f3f4f6" }}>
            <tr>
              {["Order ID", "Customer", "Phone", "Total", "Payment", "Order Status", "Update Status"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <>
                {/* Main Row */}
                <tr
                  key={o._id}
                  onClick={() => setExpanded(expanded === o._id ? null : o._id)}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    background: expanded === o._id ? "#faf5ff" : "white",
                    transition: "background 0.15s",
                  }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      #{o._id.slice(-6).toUpperCase()}
                    </span>
                    {o.shiprocket?.awbCode && (
                      <div style={{ fontSize: 10, color: "#0891b2", marginTop: 2 }}>📦 Shipped</div>
                    )}
                  </td>

                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{o.user?.name || "Guest"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{o.guestEmail || o.user?.email || "—"}</div>
                  </td>

                  <td style={tdStyle}>
                    <span style={{ fontFamily: "monospace", fontSize: 13 }}>
                      {o.phone || "—"}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    <strong>₹{o.total}</strong>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {o.paymentMethod === "cod"           && "💵 COD"}
                      {o.paymentMethod === "phone_confirm" && "📞 Phone"}
                      {o.paymentMethod === "online"        && "💳 Online"}
                    </div>
                  </td>

                  <td style={tdStyle}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 12,
                      background: o.paymentStatus === "paid"                  ? "#d1fae5"
                                : o.paymentStatus === "awaiting_confirmation" ? "#fef3c7"
                                : o.paymentStatus === "failed"                ? "#fee2e2"
                                : "#f3f4f6",
                      color:     o.paymentStatus === "paid"                  ? "#065f46"
                                : o.paymentStatus === "awaiting_confirmation" ? "#92400e"
                                : o.paymentStatus === "failed"                ? "#991b1b"
                                : "#374151",
                    }}>
                      {o.paymentStatus === "awaiting_confirmation" ? "awaiting" : o.paymentStatus}
                    </span>
                  </td>

                  <td style={tdStyle}>
                    <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, background: "#e0e7ff", color: "#3730a3" }}>
                      {o.orderStatus}
                    </span>
                  </td>

                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <select
                      value={o.orderStatus}
                      onChange={e => updateStatus(o._id, e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}
                    >
                      {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>

                {/* Expanded Detail Row */}
                {expanded === o._id && (
                  <tr key={`${o._id}-expanded`}>
                    <td colSpan={7} style={{ background: "#faf5ff", padding: "0 16px 16px 16px", borderBottom: "2px solid #e9d5ff" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, paddingTop: 16 }}>

                        {/* Tracking Token */}
                        <div style={cardStyle}>
                          <p style={cardLabel}>📦 Tracking Token</p>
                          <p style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", color: "#4c1d95", marginBottom: 8 }}>
                            {o.trackingToken || "—"}
                          </p>
                          {o.trackingToken && (
                            <button onClick={() => copyToken(o.trackingToken)} style={smallBtnStyle}>
                              Copy Token
                            </button>
                          )}
                        </div>

                        {/* Shipping Address */}
                        <div style={cardStyle}>
                          <p style={cardLabel}>📍 Shipping Address</p>
                          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#374151" }}>
                            {o.shippingAddress?.firstName} {o.shippingAddress?.lastName}<br />
                            {o.shippingAddress?.address}<br />
                            {o.shippingAddress?.city}, {o.shippingAddress?.state} {o.shippingAddress?.zip}
                          </p>
                        </div>

                        {/* Order Items */}
                        <div style={cardStyle}>
                          <p style={cardLabel}>🛍 Items ({o.items?.length})</p>
                          {o.items?.map((item, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                              <span>{item.name} × {item.quantity}</span>
                              <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: "1px solid #e9d5ff", marginTop: 8, paddingTop: 8, fontSize: 13 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
                              <span>Subtotal</span><span>₹{o.subtotal}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
                              <span>Shipping</span><span>{o.shipping === 0 ? "Free" : `₹${o.shipping}`}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
                              <span>Tax</span><span>₹{o.tax}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 4 }}>
                              <span>Total</span><span>₹{o.total}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                      {/* Shiprocket section */}
                      <div style={{ marginTop: 16, ...cardStyle }}>
                        <p style={cardLabel}>🚚 Shipping via Shiprocket</p>

                        {o.shiprocket?.awbCode ? (
                          // ✅ State 3: Fully shipped with AWB
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                            <div>
                              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>AWB Code</p>
                              <p style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{o.shiprocket.awbCode}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Courier</p>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{o.shiprocket.courierName || "—"}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Status</p>
                              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12,
                                background: "#cffafe", color: "#0e7490" }}>
                                {o.shiprocket.status || "AWB Assigned"}
                              </span>
                            </div>
                            <a href={o.shiprocket.trackingUrl} target="_blank" rel="noopener noreferrer"
                              style={{ ...smallBtnStyle, background: "#0891b2", textDecoration: "none", display: "inline-block" }}>
                              Track Shipment →
                            </a>
                          </div>
                        ) : o.shiprocket?.shipmentId ? (
                          // ⚠️ State 2: Order created, but courier assignment failed
                          <div>
                            <div style={{ padding: "8px 12px", background: "#fef3c7", borderRadius: 8, marginBottom: 10 }}>
                              <p style={{ fontSize: 13, color: "#92400e" }}>
                                ⚠️ Shipment order was created but courier assignment failed
                                (no courier serviceable, or pickup not verified). Try again below.
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); retryAWB(o._id); }}
                              disabled={shipping === o._id}
                              style={{
                                ...smallBtnStyle,
                                background: shipping === o._id ? "#94a3b8" : "#f59e0b",
                                cursor: shipping === o._id ? "not-allowed" : "pointer",
                                padding: "8px 16px", fontSize: 13,
                              }}>
                              {shipping === o._id ? "Retrying..." : "🔄 Retry Courier Assignment"}
                            </button>
                          </div>
                        ) : (
                          // 🆕 State 1: Nothing shipped yet
                          <div>
                            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                              This order hasn't been shipped yet. Click below to create a shipment on Shiprocket
                              and auto-assign a courier.
                            </p>
                            <button
                              onClick={(e) => { e.stopPropagation(); shipViaShiprocket(o._id); }}
                              disabled={shipping === o._id}
                              style={{
                                ...smallBtnStyle,
                                background: shipping === o._id ? "#94a3b8" : "#0891b2",
                                cursor: shipping === o._id ? "not-allowed" : "pointer",
                                padding: "8px 16px", fontSize: 13,
                              }}>
                              {shipping === o._id ? "Creating shipment..." : "📦 Ship via Shiprocket"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Shiprocket section */}
                      {/* <div style={{ marginTop: 16, ...cardStyle }}>
                        <p style={cardLabel}>🚚 Shipping via Shiprocket</p>

                        {o.shiprocket?.awbCode ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                            <div>
                              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>AWB Code</p>
                              <p style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{o.shiprocket.awbCode}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Courier</p>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{o.shiprocket.courierName || "—"}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Status</p>
                              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12,
                                background: "#cffafe", color: "#0e7490" }}>
                                {o.shiprocket.status || "AWB Assigned"}
                              </span>
                            </div>
                            <a href={o.shiprocket.trackingUrl} target="_blank" rel="noopener noreferrer"
                              style={{ ...smallBtnStyle, background: "#0891b2", textDecoration: "none", display: "inline-block" }}>
                              Track Shipment →
                            </a>
                          </div>
                        ) : (
                          <div>
                            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                              This order hasn't been shipped yet. Click below to create a shipment on Shiprocket
                              and auto-assign a courier.
                            </p>
                            <button
                              onClick={(e) => { e.stopPropagation(); shipViaShiprocket(o._id); }}
                              disabled={shipping === o._id}
                              style={{
                                ...smallBtnStyle,
                                background: shipping === o._id ? "#94a3b8" : "#0891b2",
                                cursor: shipping === o._id ? "not-allowed" : "pointer",
                                padding: "8px 16px", fontSize: 13,
                              }}>
                              {shipping === o._id ? "Creating shipment..." : "📦 Ship via Shiprocket"}
                            </button>
                          </div>
                        )}
                      </div> */}
                       

                      {/* Phone confirm note */}
                      {o.paymentMethod === "phone_confirm" && o.paymentStatus !== "paid" && (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef3c7", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
                          📞 <strong>Action needed:</strong> Call customer at <strong>{o.phone}</strong> to confirm payment. Share tracking token after confirmation.
                        </div>
                      )}
                      {o.paymentMethod === "cod" && (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "#ecfdf5", borderRadius: 8, fontSize: 13, color: "#065f46" }}>
                          💵 <strong>COD Order:</strong> Collect ₹{o.total} at delivery from {o.shippingAddress?.firstName}.
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle  = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" };
const tdStyle  = { padding: "12px 16px", fontSize: 14, color: "#374151", verticalAlign: "middle" };
const cardStyle = { background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e9d5ff" };
const cardLabel = { fontSize: 12, fontWeight: 700, color: "#7c3aed", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" };
const smallBtnStyle = { padding: "5px 12px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" };