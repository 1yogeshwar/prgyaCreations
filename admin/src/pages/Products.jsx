// import { useEffect, useState } from "react";
// import axios from "axios";
// import { toast } from "sonner";

// const API = process.env.REACT_APP_API_URL;
// const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("admin-token")}` });

// const empty = { name: "", slug: "", description: "", price: "", originalPrice: "", category: "", subcategory: "", stock: "", images: "", isFeatured: false, isBestseller: false, isNew: false, isOnSale: false };

// export default function Products() {
//   const [products, setProducts] = useState([]);
//   const [form, setForm] = useState(empty);
//   const [editing, setEditing] = useState(null);
//   const [showForm, setShowForm] = useState(false);

//   const load = () => axios.get(`${API}/products`).then(r => setProducts(r.data));
//   useEffect(() => { load(); }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const payload = {
//         ...form,
//         images: form.images
//           .split(",")
//           .map((image) => image.trim())
//           .filter(Boolean),
//       };
//       if (editing) {
//         await axios.put(`${API}/admin/products/${editing}`, payload, { headers: authHeader() });
//         toast.success("Product updated!");
//       } else {
//         await axios.post(`${API}/admin/products`, payload, { headers: authHeader() });
//         toast.success("Product created!");
//       }
//       setForm(empty); setEditing(null); setShowForm(false); load();
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error saving product");
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this product?")) return;
//     await axios.delete(`${API}/admin/products/${id}`, { headers: authHeader() });
//     toast.success("Deleted!"); load();
//   };

//   const handleEdit = (p) => {
//     setForm({
//       name: p.name,
//       slug: p.slug,
//       description: p.description,
//       price: p.price,
//       originalPrice: p.originalPrice || "",
//       category: p.category,
//       subcategory: p.subcategory || "",
//       stock: p.stock,
//       images: Array.isArray(p.images) ? p.images.join(", ") : "",
//       isFeatured: p.isFeatured,
//       isBestseller: p.isBestseller,
//       isNew: p.isNew,
//       isOnSale: p.isOnSale,
//     });
//     setEditing(p._id); setShowForm(true);
//   };

//   return (
//     <div>
//       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
//         <h2>Products</h2>
//         <button onClick={() => { setForm(empty); setEditing(null); setShowForm(!showForm); }} style={btnStyle}>
//           {showForm ? "Cancel" : "+ Add Product"}
//         </button>
//       </div>

//       {showForm && (
//         <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 24, borderRadius: 12, marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
//           {[["name","Name"],["slug","Slug"],["price","Price"],["originalPrice","Original Price"],["category","Category"],["subcategory","Subcategory"],["stock","Stock"],["images","Images (comma-separated URLs)"]].map(([key, label]) => (
//             <div key={key}>
//               <label style={labelStyle}>{label}</label>
//               <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
//                 style={inputStyle} placeholder={label} required={["name","price","category"].includes(key)} />
//             </div>
//           ))}
//           <div style={{ gridColumn: "span 2" }}>
//             <label style={labelStyle}>Description</label>
//             <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
//               style={{ ...inputStyle, height: 80 }} required />
//           </div>
//           <div style={{ gridColumn: "span 2", display: "flex", gap: 24 }}>
//             {["isFeatured","isBestseller","isNew","isOnSale"].map(key => (
//               <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
//                 <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} />
//                 {key.replace("is", "Is ")}
//               </label>
//             ))}
//           </div>
//           <div style={{ gridColumn: "span 2" }}>
//             <button type="submit" style={btnStyle}>{editing ? "Update Product" : "Create Product"}</button>
//           </div>
//         </form>
//       )}

//       <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
//         <table style={{ width: "100%", borderCollapse: "collapse" }}>
//           <thead style={{ background: "#f3f4f6" }}>
//             <tr>{["Name","Category","Price","Stock","Actions"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
//           </thead>
//           <tbody>
//             {products.map(p => (
//               <tr key={p._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
//                 <td style={tdStyle}>{p.name}</td>
//                 <td style={tdStyle}>{p.category}</td>
//                 <td style={tdStyle}>₹{p.price}</td>
//                 <td style={tdStyle}>{p.stock}</td>
//                 <td style={tdStyle}>
//                   <button onClick={() => handleEdit(p)} style={{ ...smallBtn, background: "#0ea5e9" }}>Edit</button>
//                   <button onClick={() => handleDelete(p._id)} style={{ ...smallBtn, background: "#ef4444" }}>Delete</button>
//                 </td>
//               </tr>
//             ))}
//             {products.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>No products yet</td></tr>}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// const inputStyle = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" };
// const labelStyle = { display: "block", marginBottom: 4, fontSize: 13, color: "#374151", fontWeight: 600 };
// const btnStyle = { padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 };
// const smallBtn = { padding: "6px 12px", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, marginRight: 6 };
// const thStyle = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" };
// const tdStyle = { padding: "12px 16px", fontSize: 14, color: "#374151" };

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("admin-token")}` });

// ── Master category + subcategory data ──
const CATEGORIES = {
  "Keyring": [
    "Resin Keyring",
    "Pipe Cleaner Keyring",
    "Dream Catcher Keyring",
    "Embroidery Crochet Keyring",
  ],
  "Frames": [
    "Resin Frame",
    "String Art Frame",
    "Embroidery Hoop Frame",
    "Glass Frame",
  ],
  "Jewellery": [
    "Beads Bracelet",
    "Evil Eye Bracelet",
    "Charms Anklet",
    "Threads Charms Anklet",
    "Tribal Boho Hair Tie",
    "Shrink Jewellery",
    "Jute Brooch",
  ],
  "Crochet": [
    "Gajra",
    "Daisy Flower Keyring",
    "Peacock Feather Keyring",
    "Watermelon Keyring",
    "Evil Eye Keyring",
    "Other Crochet",
  ],
  "Engagement Ring Platter": [],
  "Pipe Cleaner Flower Bouquet": [],
  "Fridge Magnet": [],
  "Embroidery Hair Clip": [],
  "Resin": [
    "Rose Preservation Earrings",
    "Resin Ring",
    "Heart Shape Pendant",
    "Round Pendant",
    "Rectangle Pendant",
    "Resin Frame 6 inch",
    "Resin Frame 10 inch",
    "Resin Frame 12 inch",
    "Resin Frame 14 inch",
    "Resin Name Keyring",
    "Heart Shape Keyring",
    "Car Hanging",
  ],
};

const empty = {
  name: "", slug: "", description: "",
  price: "", originalPrice: "",
  category: "", subcategory: "", stock: "",
  images: "",
  shipping: {
    sku: "", weightKg: "", lengthCm: "", breadthCm: "", heightCm: "",
  },
  isFeatured: false, isBestseller: false, isNew: false, isOnSale: false,
};

export default function Products() {
  const [products, setProducts]   = useState([]);
  const [form, setForm]           = useState(empty);
  const [editing, setEditing]     = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [subcats, setSubcats]     = useState([]);

  const load = () => axios.get(`${API}/products`).then(r => setProducts(r.data));
  useEffect(() => { load(); }, []);

  // Update subcategory list when category changes
  const handleCategoryChange = (cat) => {
    setForm(f => ({ ...f, category: cat, subcategory: "" }));
    setSubcats(CATEGORIES[cat] || []);
  };

  // Auto-generate slug from name
  const handleNameChange = (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm(f => ({ ...f, name, slug }));
  };

  const updateShippingField = (field, value) => {
    setForm(f => ({ ...f, shipping: { ...f.shipping, [field]: value } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const measurementFields = ["weightKg", "lengthCm", "breadthCm", "heightCm"];
    const hasAnyMeasurement = measurementFields.some(field => form.shipping[field] !== "");
    const hasAllMeasurements = measurementFields.every(field => form.shipping[field] !== "");
    const hasInvalidMeasurement = measurementFields.some((field) => {
      const value = form.shipping[field];
      return value !== "" && (!Number.isFinite(Number(value)) || Number(value) <= 0);
    });

    if ((!editing || hasAnyMeasurement) && !hasAllMeasurements) {
      toast.error("Enter weight and all three parcel dimensions, or leave them blank only for a legacy product.");
      return;
    }
    if (hasInvalidMeasurement) {
      toast.error("Parcel weight and dimensions must be greater than zero.");
      return;
    }

    try {
      const shipping = {
        sku: form.shipping.sku.trim(),
        ...Object.fromEntries(
          measurementFields
            .filter(field => form.shipping[field] !== "")
            .map(field => [field, Number(form.shipping[field])])
        ),
      };
      if (!shipping.sku) delete shipping.sku;

      const payload = {
        ...form,
        images: form.images.split(",").map(i => i.trim()).filter(Boolean),
      };
      if (Object.keys(shipping).length > 0) payload.shipping = shipping;
      else delete payload.shipping;
      if (editing) {
        await axios.put(`${API}/admin/products/${editing}`, payload, { headers: authHeader() });
        toast.success("Product updated!");
      } else {
        await axios.post(`${API}/admin/products`, payload, { headers: authHeader() });
        toast.success("Product created!");
      }
      setForm(empty); setEditing(null); setShowForm(false); setSubcats([]); load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving product");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await axios.delete(`${API}/admin/products/${id}`, { headers: authHeader() });
    toast.success("Deleted!"); load();
  };

  const handleEdit = (p) => {
    setForm({
      name:          p.name,
      slug:          p.slug,
      description:   p.description,
      price:         p.price,
      originalPrice: p.originalPrice || "",
      category:      p.category,
      subcategory:   p.subcategory || "",
      stock:         p.stock,
      images:        Array.isArray(p.images) ? p.images.join(", ") : "",
      shipping: {
        sku:       p.shipping?.sku || "",
        weightKg:  p.shipping?.weightKg ?? "",
        lengthCm:  p.shipping?.lengthCm ?? "",
        breadthCm: p.shipping?.breadthCm ?? "",
        heightCm:  p.shipping?.heightCm ?? "",
      },
      isFeatured:    p.isFeatured,
      isBestseller:  p.isBestseller,
      isNew:         p.isNew,
      isOnSale:      p.isOnSale,
    });
    setSubcats(CATEGORIES[p.category] || []);
    setEditing(p._id);
    setShowForm(true);
  };

  return (
    <div className="products-page">
      <div className="products-page-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 className="products-page-title">Products</h2>
        <div className="products-page-actions">
          <button onClick={() => { setForm(empty); setEditing(null); setSubcats([]); setShowForm(!showForm); }}
            className="products-page-add-button" style={btnStyle}>
            {showForm ? "Cancel" : "+ Add Product"}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="products-form" onSubmit={handleSubmit} style={{
          background: "#fff", padding: 24, borderRadius: 12,
          marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
        }}>

          {/* Name — auto generates slug */}
          <div className="products-form-field">
            <label style={labelStyle}>Name *</label>
            <input value={form.name} onChange={e => handleNameChange(e.target.value)}
              style={inputStyle} placeholder="Product name" required />
          </div>

          {/* Slug — auto filled, editable */}
          <div className="products-form-field">
            <label style={labelStyle}>Slug (auto-generated)</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              style={{ ...inputStyle, color: "#6b7280" }} placeholder="auto-generated-slug" />
          </div>

          {/* Category dropdown */}
          <div className="products-form-field">
            <label style={labelStyle}>Category *</label>
            <select
              value={form.category}
              onChange={e => handleCategoryChange(e.target.value)}
              style={inputStyle} required>
              <option value="">— Select category —</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Subcategory — dependent on category */}
          <div className="products-form-field">
            <label style={labelStyle}>Subcategory</label>
            {subcats.length > 0 ? (
              <select
                value={form.subcategory}
                onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                style={inputStyle}>
                <option value="">— Select subcategory —</option>
                {subcats.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            ) : (
              <input
                value={form.subcategory}
                onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                style={{ ...inputStyle, color: "#9ca3af" }}
                placeholder="No subcategories for this category" disabled={!form.category}
              />
            )}
          </div>

          {/* Price fields */}
          <div className="products-form-field">
            <label style={labelStyle}>Price (₹) *</label>
            <input type="number" value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              style={inputStyle} placeholder="e.g. 299" required />
          </div>

          <div className="products-form-field">
            <label style={labelStyle}>Original Price (₹) <span style={{ color: "#9ca3af", fontWeight: 400 }}>(for strike-through)</span></label>
            <input type="number" value={form.originalPrice}
              onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
              style={inputStyle} placeholder="e.g. 399" />
          </div>

          {/* Stock */}
          <div className="products-form-field">
            <label style={labelStyle}>Stock *</label>
            <input type="number" value={form.stock}
              onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
              style={inputStyle} placeholder="e.g. 10" required />
          </div>

          {/* Shipping parcel details */}
          <fieldset className="products-shipping-fieldset products-form-wide" style={{
            gridColumn: "span 2", margin: 0, padding: 16, borderRadius: 8,
            border: "1px solid #ddd", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
          }}>
            <legend style={{ ...labelStyle, padding: "0 6px" }}>Shipping parcel data</legend>
            <p className="products-shipping-help" style={{ gridColumn: "span 2", margin: 0, color: "#6b7280", fontSize: 12 }}>
              Used for automatic Shiprocket fulfillment. Measurements are required for new products; legacy products can remain blank until their parcel data is known.
            </p>
            <div className="products-shipping-field">
              <label style={labelStyle}>SKU <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span></label>
              <input value={form.shipping.sku}
                onChange={e => updateShippingField("sku", e.target.value)}
                style={inputStyle} placeholder="e.g. PC-KEYRING-001" maxLength={100} />
            </div>
            <div className="products-shipping-field">
              <label style={labelStyle}>Weight (kg){!editing && " *"}</label>
              <input type="number" min="0.001" step="0.001" value={form.shipping.weightKg}
                onChange={e => updateShippingField("weightKg", e.target.value)}
                style={inputStyle} placeholder="e.g. 0.25" required={!editing} />
            </div>
            <div className="products-shipping-field">
              <label style={labelStyle}>Length (cm){!editing && " *"}</label>
              <input type="number" min="0.1" step="0.1" value={form.shipping.lengthCm}
                onChange={e => updateShippingField("lengthCm", e.target.value)}
                style={inputStyle} placeholder="e.g. 15" required={!editing} />
            </div>
            <div className="products-shipping-field">
              <label style={labelStyle}>Breadth (cm){!editing && " *"}</label>
              <input type="number" min="0.1" step="0.1" value={form.shipping.breadthCm}
                onChange={e => updateShippingField("breadthCm", e.target.value)}
                style={inputStyle} placeholder="e.g. 10" required={!editing} />
            </div>
            <div className="products-shipping-field">
              <label style={labelStyle}>Height (cm){!editing && " *"}</label>
              <input type="number" min="0.1" step="0.1" value={form.shipping.heightCm}
                onChange={e => updateShippingField("heightCm", e.target.value)}
                style={inputStyle} placeholder="e.g. 5" required={!editing} />
            </div>
          </fieldset>

          {/* Images */}
          <div className="products-form-field">
            <label style={labelStyle}>
              Image URLs
              <span style={{ fontWeight: 400, color: "#9ca3af" }}> (comma-separated)</span>
            </label>
            <input value={form.images}
              onChange={e => setForm(f => ({ ...f, images: e.target.value }))}
              style={inputStyle} placeholder="https://..., https://..." />
          </div>

          {/* Description */}
          <div className="products-form-wide" style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Description *</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ ...inputStyle, height: 80 }} required />
          </div>

          {/* Flags */}
          <div className="products-flags-section products-form-wide" style={{ gridColumn: "span 2" }}>
            <label style={{ ...labelStyle, marginBottom: 10 }}>Product flags</label>
            <div className="products-flag-options products-flags" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                ["isFeatured",   "⭐ Featured"],
                ["isBestseller", "🏆 Bestseller"],
                ["isNew",        "🆕 New Arrival"],
                ["isOnSale",     "🔖 On Sale"],
              ].map(([key, label]) => (
                <label key={key} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: "pointer", fontSize: 13, fontWeight: 500,
                  padding: "8px 14px",
                  background: form[key] ? "#ede9fe" : "#f9fafb",
                  border: `1px solid ${form[key] ? "#7c3aed" : "#e5e7eb"}`,
                  borderRadius: 8, transition: "all 0.15s",
                  color: form[key] ? "#7c3aed" : "#374151",
                }}>
                  <input type="checkbox" checked={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    style={{ accentColor: "#7c3aed" }} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Preview images */}
          {form.images && (
            <div className="products-image-preview products-form-wide" style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Image Preview</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {form.images.split(",").map(url => url.trim()).filter(Boolean).map((url, i) => (
                  <img key={i} src={url} alt={`preview ${i+1}`}
                    style={{ width: 80, height: 80, objectFit: "cover",
                      borderRadius: 8, border: "1px solid #e5e7eb" }}
                    onError={e => { e.currentTarget.style.display = "none"; }}/>
                ))}
              </div>
            </div>
          )}

          <div className="products-form-actions products-form-wide" style={{ gridColumn: "span 2" }}>
            <button type="submit" style={btnStyle}>
              {editing ? "Update Product" : "Create Product"}
            </button>
            {editing && (
              <button type="button" onClick={() => { setForm(empty); setEditing(null); setShowForm(false); setSubcats([]); }}
                style={{ ...btnStyle, background: "#6b7280", marginLeft: 10 }}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {/* Products table */}
      <div className="products-table-wrap desktop-only" style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
        <table className="products-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f3f4f6" }}>
            <tr>{["Name","Category","Subcategory","Price","Stock","Flags","Actions"].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{p.slug}</div>
                </td>
                <td style={tdStyle}>{p.category}</td>
                <td style={tdStyle}>{p.subcategory || <span style={{ color: "#d1d5db" }}>—</span>}</td>
                <td style={tdStyle}>
                  <strong>₹{p.price}</strong>
                  {p.originalPrice && (
                    <div style={{ fontSize: 11, color: "#9ca3af", textDecoration: "line-through" }}>₹{p.originalPrice}</div>
                  )}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "3px 8px", borderRadius: 20, fontSize: 11,
                    background: p.stock > 5 ? "#d1fae5" : p.stock > 0 ? "#fef3c7" : "#fee2e2",
                    color: p.stock > 5 ? "#065f46" : p.stock > 0 ? "#92400e" : "#991b1b",
                    fontWeight: 600,
                  }}>
                    {p.stock > 0 ? `${p.stock} left` : "Out of stock"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {p.isFeatured   && <span style={flagStyle("#7c3aed")}>⭐</span>}
                    {p.isBestseller && <span style={flagStyle("#f59e0b")}>🏆</span>}
                    {p.isNew        && <span style={flagStyle("#10b981")}>🆕</span>}
                    {p.isOnSale     && <span style={flagStyle("#ef4444")}>🔖</span>}
                  </div>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => handleEdit(p)} style={{ ...smallBtn, background: "#0ea5e9" }}>Edit</button>
                  <button onClick={() => handleDelete(p._id)} style={{ ...smallBtn, background: "#ef4444" }}>Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                No products yet — add your first product!
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="products-mobile-list mobile-only" aria-label="Products">
        {products.map(p => (
          <article className="product-card" key={p._id}>
            <div className="product-card-header product-card__top">
              <div className="product-card-title-group">
                <h3 className="product-card-title product-card__name">{p.name}</h3>
                {p.slug && <p className="product-card-slug product-card__slug">{p.slug}</p>}
              </div>
              <span className="product-card-stock-badge product-card__stock" style={{
                padding: "3px 8px", borderRadius: 20, fontSize: 11,
                background: p.stock > 5 ? "#d1fae5" : p.stock > 0 ? "#fef3c7" : "#fee2e2",
                color: p.stock > 5 ? "#065f46" : p.stock > 0 ? "#92400e" : "#991b1b",
                fontWeight: 600,
              }}>
                {p.stock > 0 ? `${p.stock} left` : "Out of stock"}
              </span>
            </div>

            <div className="product-card-details product-card__price-row">
              <div className="product-card-price product-card__price">
                <strong>₹{p.price}</strong>
                {p.originalPrice && <span className="product-card-original-price product-card__original-price">₹{p.originalPrice}</span>}
              </div>
              <div className="product-card-category product-card__meta">
                <span>{p.category}</span>
                {p.subcategory && <span className="product-card-subcategory">{p.subcategory}</span>}
              </div>
            </div>

            <div className="product-card-flags product-card__flags" aria-label="Product flags">
              {p.isFeatured && <span style={flagStyle("#7c3aed")} title="Featured" aria-label="Featured">⭐</span>}
              {p.isBestseller && <span style={flagStyle("#f59e0b")} title="Bestseller" aria-label="Bestseller">🏆</span>}
              {p.isNew && <span style={flagStyle("#10b981")} title="New arrival" aria-label="New arrival">🆕</span>}
              {p.isOnSale && <span style={flagStyle("#ef4444")} title="On sale" aria-label="On sale">🔖</span>}
            </div>

            <div className="product-card-actions product-card__actions">
              <button type="button" onClick={() => handleEdit(p)} className="product-card-edit-button"
                style={{ ...smallBtn, background: "#0ea5e9" }}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(p._id)} className="product-card-delete-button"
                style={{ ...smallBtn, background: "#ef4444" }}>
                Delete
              </button>
            </div>
          </article>
        ))}
        {products.length === 0 && (
          <div className="products-mobile-empty">No products yet — add your first product!</div>
        )}
      </div>
    </div>
  );
}

const flagStyle = (color) => ({
  padding: "2px 6px", borderRadius: 6, fontSize: 12,
  background: `${color}15`, border: `1px solid ${color}30`,
});

const inputStyle  = { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" };
const labelStyle  = { display: "block", marginBottom: 4, fontSize: 13, color: "#374151", fontWeight: 600 };
const btnStyle    = { padding: "10px 20px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 };
const smallBtn    = { padding: "6px 12px", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, marginRight: 6 };
const thStyle     = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#374151" };
const tdStyle     = { padding: "12px 16px", fontSize: 14, color: "#374151" };
