import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("admin-token")}` });

const empty = {
  title: "", description: "", location: "", date: "",
  image: "", tag: "exhibition", isPublished: true,
};

export default function Events() {
  const [events, setEvents]   = useState([]);
  const [form, setForm]       = useState(empty);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    axios.get(`${API}/events`).then(r => setEvents(r.data));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await axios.put(`${API}/events/${editing}`, form, { headers: authHeader() });
        toast.success("Event updated!");
      } else {
        await axios.post(`${API}/events`, form, { headers: authHeader() });
        toast.success("Event created!");
      }
      setForm(empty); setEditing(null); setShowForm(false); load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving event");
    }
  };

  const handleEdit = (ev) => {
    setForm({
      title: ev.title, description: ev.description,
      location: ev.location, date: ev.date?.slice(0, 10),
      image: ev.image || "", tag: ev.tag, isPublished: ev.isPublished,
    });
    setEditing(ev._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    await axios.delete(`${API}/events/${id}`, { headers: authHeader() });
    toast.success("Deleted!"); load();
  };

  return (
    <div className="admin-page">
      <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <h2>Events & Fairs</h2>
        <button onClick={() => { setForm(empty); setEditing(null); setShowForm(!showForm); }} className="page-action"
          style={btnStyle}>
          {showForm ? "Cancel" : "+ Add Event"}
        </button>
      </div>

      {showForm && (
        <form className="responsive-form" onSubmit={handleSubmit} style={{
          background: "#fff", padding: 24, borderRadius: 12, marginBottom: 24,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
        }}>
          {[["title","Title"],["location","Location"],["image","Image URL"]].map(([key, label]) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                style={inputStyle} placeholder={label} required={key !== "image"} />
            </div>
          ))}

          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Tag</label>
            <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}
              style={inputStyle}>
              {["exhibition", "pop-up", "market", "festival"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, height: 80 }} required />
          </div>

          <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.isPublished}
              onChange={e => setForm({ ...form, isPublished: e.target.checked })} />
            <label style={{ fontSize: 14 }}>Published (visible on site)</label>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <button type="submit" style={btnStyle}>
              {editing ? "Update Event" : "Create Event"}
            </button>
          </div>
        </form>
      )}

      <div className="events-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {events.map(ev => (
          <div key={ev._id} style={{
            background: "#fff", borderRadius: 12, overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>
            {ev.image && (
              <img src={ev.image} alt={ev.title}
                style={{ width: "100%", height: 160, objectFit: "cover" }} />
            )}
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 11,
                  fontWeight: 600, background: "#ede9fe", color: "#7c3aed",
                  textTransform: "capitalize",
                }}>{ev.tag}</span>
                {!ev.isPublished && (
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>Draft</span>
                )}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{ev.title}</h3>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                📍 {ev.location}
              </p>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
                📅 {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              <p style={{ fontSize: 13, color: "#374151", marginBottom: 12, lineHeight: 1.5 }}>
                {ev.description.slice(0, 100)}...
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleEdit(ev)}
                  style={{ ...smallBtn, background: "#0ea5e9" }}>Edit</button>
                <button onClick={() => handleDelete(ev._id)}
                  style={{ ...smallBtn, background: "#ef4444" }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p style={{ color: "#9ca3af", gridColumn: "span 3", textAlign: "center", padding: 40 }}>
            No events yet — add your first event!
          </p>
        )}
      </div>
    </div>
  );
}

const inputStyle  = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" };
const labelStyle  = { display: "block", marginBottom: 4, fontSize: 13, fontWeight: 600, color: "#374151" };
const btnStyle    = { padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 };
const smallBtn    = { padding: "6px 12px", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
