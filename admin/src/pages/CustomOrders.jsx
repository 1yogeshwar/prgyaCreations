import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("admin-token")}` });

const STATUS = ["pending","reviewing","quoted","confirmed","in_progress","completed","cancelled"];

const statusColors = {
  pending:     { bg: "#fef3c7", color: "#92400e" },
  reviewing:   { bg: "#dbeafe", color: "#1e40af" },
  quoted:      { bg: "#ede9fe", color: "#5b21b6" },
  confirmed:   { bg: "#d1fae5", color: "#065f46" },
  in_progress: { bg: "#fce7f3", color: "#9d174d" },
  completed:   { bg: "#d1fae5", color: "#065f46" },
  cancelled:   { bg: "#fee2e2", color: "#991b1b" },
};

export default function CustomOrders() {
  const [orders, setOrders]     = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [quoteForm, setQuoteForm] = useState({});

  const load = () =>
    axios.get(`${API}/custom-orders`, { headers: authHeader() })
      .then(r => setOrders(r.data));

  useEffect(() => { load(); }, []);

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API}/custom-orders/${id}`, quoteForm[id], { headers: authHeader() });
      toast.success("Updated!");
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const setField = (id, field, value) => {
    setQuoteForm(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  return (
    <div className="admin-page">
      <h2 style={{ marginBottom: 8 }}>Custom Orders</h2>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
        Review customer custom requests, set a price and update status.
      </p>

      {orders.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          No custom orders yet 🎨
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map(o => {
          const sc = statusColors[o.status] || statusColors.pending;
          const isExpanded = expanded === o._id;
          const toggleExpanded = () => setExpanded(isExpanded ? null : o._id);
          return (
            <div key={o._id} style={{
              background: "#fff", borderRadius: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}>
              {/* Row */}
              <div className="custom-order-row" role="button" tabIndex={0}
                aria-expanded={isExpanded}
                aria-controls={`custom-order-details-${o._id}`}
                onClick={toggleExpanded}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleExpanded();
                  }
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 120px 140px 40px",
                  alignItems: "center", gap: 16,
                  padding: "16px 20px", cursor: "pointer",
                  background: isExpanded ? "#faf5ff" : "#fff",
                }}>

                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{o.name}</p>
                  <p style={{ fontSize: 12, color: "#6b7280" }}>{o.email}</p>
                  <p style={{ fontSize: 12, color: "#6b7280" }}>{o.phone}</p>
                </div>

                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                    {o.productReference || o.category || "General custom"}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280" }}>
                    {o.description?.slice(0, 60)}...
                  </p>
                </div>

                <div>
                  {o.quotedPrice
                    ? <p style={{ fontWeight: 700, color: "#7c3aed", fontSize: 15 }}>₹{o.quotedPrice}</p>
                    : <p style={{ fontSize: 12, color: "#9ca3af" }}>Not quoted</p>
                  }
                </div>

                <span style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 12,
                  fontWeight: 600, background: sc.bg, color: sc.color,
                  textTransform: "capitalize", display: "inline-block",
                }}>
                  {o.status.replace("_", " ")}
                </span>

                <span style={{ fontSize: 18, color: "#9ca3af" }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div id={`custom-order-details-${o._id}`} className="custom-order-expanded" style={{ padding: "0 20px 20px", borderTop: "1px solid #f3f4f6" }}>
                  <div className="custom-order-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>

                    {/* Full request details */}
                    <div style={{ background: "#faf5ff", borderRadius: 10, padding: 16 }}>
                      <p style={cardLabel}>📋 Request Details</p>
                      <p style={detailText}><strong>Category:</strong> {o.category || "—"}</p>
                      <p style={detailText}><strong>Product ref:</strong> {o.productReference || "—"}</p>
                      <p style={detailText}><strong>Description:</strong> {o.description}</p>
                      {o.parameters?.size      && <p style={detailText}><strong>Size:</strong> {o.parameters.size}</p>}
                      {o.parameters?.color     && <p style={detailText}><strong>Color:</strong> {o.parameters.color}</p>}
                      {o.parameters?.name      && <p style={detailText}><strong>Name/Text:</strong> {o.parameters.name}</p>}
                      {o.parameters?.quantity  && <p style={detailText}><strong>Quantity:</strong> {o.parameters.quantity}</p>}
                      {o.parameters?.extraNotes && <p style={detailText}><strong>Extra notes:</strong> {o.parameters.extraNotes}</p>}
                      {o.referenceImage && (
                        <div style={{ marginTop: 8 }}>
                          <p style={detailText}><strong>Reference image:</strong></p>
                          <img src={o.referenceImage} alt="reference"
                            style={{ width: "100%", borderRadius: 8, marginTop: 4, maxHeight: 160, objectFit: "cover" }}/>
                        </div>
                      )}
                      <p style={{ ...detailText, color: "#9ca3af", marginTop: 8 }}>
                        Received: {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>

                    {/* Admin action */}
                    <div style={{ background: "#fff", borderRadius: 10, padding: 16, border: "1px solid #e9d5ff" }}>
                      <p style={cardLabel}>⚙️ Admin Action</p>

                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Update Status</label>
                        <select
                          defaultValue={o.status}
                          onChange={e => setField(o._id, "status", e.target.value)}
                          style={inputStyle}>
                          {STATUS.map(s => (
                            <option key={s} value={s}>{s.replace("_", " ")}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Quoted Price (₹)</label>
                        <input type="number"
                          defaultValue={o.quotedPrice}
                          placeholder="e.g. 499"
                          onChange={e => setField(o._id, "quotedPrice", Number(e.target.value))}
                          style={inputStyle}/>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Message to Customer</label>
                        <textarea
                          defaultValue={o.adminNote}
                          placeholder="e.g. Hi! Your custom keyring will cost ₹499 and take 5 days..."
                          onChange={e => setField(o._id, "adminNote", e.target.value)}
                          style={{ ...inputStyle, height: 80 }}/>
                      </div>

                      <button onClick={() => handleUpdate(o._id)} style={btnStyle}>
                        Save & Update
                      </button>

                      {o.adminNote && (
                        <div style={{ marginTop: 12, padding: 10, background: "#f0fdf4", borderRadius: 8, fontSize: 13, color: "#166534" }}>
                          <strong>Last message sent:</strong><br/>{o.adminNote}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cardLabel  = { fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 };
const detailText = { fontSize: 13, color: "#374151", marginBottom: 4, lineHeight: 1.5 };
const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, boxSizing: "border-box", marginBottom: 0 };
const btnStyle   = { width: "100%", padding: "10px 0", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 };
