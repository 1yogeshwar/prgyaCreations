import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Loader from "../components/Loader";

const API = process.env.REACT_APP_API_URL;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin-token")}`,
});

// ─────────────────────────────────────────────
// Category + subcategory data
// ─────────────────────────────────────────────

const CATEGORIES = {
  Keyring: [
    "Resin Keyring",
    "Pipe Cleaner Keyring",
    "Dream Catcher Keyring",
    "Embroidery Crochet Keyring",
  ],

  Frames: [
    "Resin Frame",
    "String Art Frame",
    "Embroidery Hoop Frame",
    "Glass Frame",
  ],

  Jewellery: [
    "Beads Bracelet",
    "Evil Eye Bracelet",
    "Charms Anklet",
    "Threads Charms Anklet",
    "Tribal Boho Hair Tie",
    "Shrink Jewellery",
    "Jute Brooch",
  ],

  Crochet: [
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

  Resin: [
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

// ─────────────────────────────────────────────
// Empty form
// ─────────────────────────────────────────────

const empty = {
  name: "",
  slug: "",
  description: "",

  price: "",
  originalPrice: "",

  category: "",
  subcategory: "",

  stock: "",

  images: "",

  shipping: {
    sku: "",
    weightKg: "",
    lengthCm: "",
    breadthCm: "",
    heightCm: "",
  },

  isFeatured: false,
  isBestseller: false,
  isNew: false,
  isOnSale: false,
};

export default function Products() {
  // ─────────────────────────────────────────
  // Main state
  // ─────────────────────────────────────────

  const [products, setProducts] = useState([]);

  const [form, setForm] = useState(empty);

  const [editing, setEditing] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [subcats, setSubcats] = useState([]);

  // ─────────────────────────────────────────
  // Loading states
  // ─────────────────────────────────────────

  // Full table shimmer - initial fetch only
  const [loading, setLoading] = useState(true);

  // Create / Update
  const [saving, setSaving] = useState(false);

  // Delete specific product
  const [deletingId, setDeletingId] = useState(null);

  // ─────────────────────────────────────────
  // Products loading
  // ─────────────────────────────────────────

  const load = async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await axios.get(`${API}/products`);

      setProducts(response.data);
    } catch (error) {
      console.error("Products load error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to load products"
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load({ showLoader: true });
  }, []);

  // ─────────────────────────────────────────
  // Category change
  // ─────────────────────────────────────────

  const handleCategoryChange = (category) => {
    setForm((current) => ({
      ...current,
      category,
      subcategory: "",
    }));

    setSubcats(CATEGORIES[category] || []);
  };

  // ─────────────────────────────────────────
  // Auto slug
  // ─────────────────────────────────────────

  const handleNameChange = (name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    setForm((current) => ({
      ...current,
      name,
      slug,
    }));
  };

  // ─────────────────────────────────────────
  // Shipping fields
  // ─────────────────────────────────────────

  const updateShippingField = (field, value) => {
    setForm((current) => ({
      ...current,

      shipping: {
        ...current.shipping,
        [field]: value,
      },
    }));
  };

  // ─────────────────────────────────────────
  // Create / Update
  // ─────────────────────────────────────────

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    const measurementFields = [
      "weightKg",
      "lengthCm",
      "breadthCm",
      "heightCm",
    ];

    const hasAnyMeasurement =
      measurementFields.some(
        (field) => form.shipping[field] !== ""
      );

    const hasAllMeasurements =
      measurementFields.every(
        (field) => form.shipping[field] !== ""
      );

    const hasInvalidMeasurement =
      measurementFields.some((field) => {
        const value = form.shipping[field];

        return (
          value !== "" &&
          (!Number.isFinite(Number(value)) ||
            Number(value) <= 0)
        );
      });

    // New product:
    // all measurements required.
    //
    // Existing legacy product:
    // either all filled or all empty.
    if (
      (!editing || hasAnyMeasurement) &&
      !hasAllMeasurements
    ) {
      toast.error(
        "Enter weight and all three parcel dimensions, or leave them blank only for a legacy product."
      );

      return;
    }

    if (hasInvalidMeasurement) {
      toast.error(
        "Parcel weight and dimensions must be greater than zero."
      );

      return;
    }

    try {
      setSaving(true);

      const shipping = {
        sku: form.shipping.sku.trim(),

        ...Object.fromEntries(
          measurementFields
            .filter(
              (field) =>
                form.shipping[field] !== ""
            )
            .map((field) => [
              field,
              Number(form.shipping[field]),
            ])
        ),
      };

      if (!shipping.sku) {
        delete shipping.sku;
      }

      const payload = {
        ...form,

        images: form.images
          .split(",")
          .map((image) => image.trim())
          .filter(Boolean),
      };

      if (Object.keys(shipping).length > 0) {
        payload.shipping = shipping;
      } else {
        delete payload.shipping;
      }

      if (editing) {
        // ───────── UPDATE ─────────

        await axios.put(
          `${API}/admin/products/${editing}`,
          payload,
          {
            headers: authHeader(),
          }
        );

        toast.success("Product updated!");
      } else {
        // ───────── CREATE ─────────

        await axios.post(
          `${API}/admin/products`,
          payload,
          {
            headers: authHeader(),
          }
        );

        toast.success("Product created!");
      }

      // Reset form
      setForm(empty);

      setEditing(null);

      setShowForm(false);

      setSubcats([]);

      // Important:
      // silent refresh after mutation.
      // Full table shimmer will NOT appear.
      await load();
    } catch (error) {
      console.error("Product save error:", error);

      toast.error(
        error.response?.data?.message ||
          "Error saving product"
      );
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────

  const handleDelete = async (id) => {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this product?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      await axios.delete(
        `${API}/admin/products/${id}`,
        {
          headers: authHeader(),
        }
      );

      toast.success("Deleted!");

      // Silent refresh
      await load();
    } catch (error) {
      console.error("Product delete error:", error);

      toast.error(
        error.response?.data?.message ||
          "Error deleting product"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ─────────────────────────────────────────
  // Edit
  // ─────────────────────────────────────────

  const handleEdit = (product) => {
    setForm({
      name: product.name,

      slug: product.slug,

      description: product.description,

      price: product.price,

      originalPrice:
        product.originalPrice || "",

      category: product.category,

      subcategory:
        product.subcategory || "",

      stock: product.stock,

      images: Array.isArray(product.images)
        ? product.images.join(", ")
        : "",

      shipping: {
        sku:
          product.shipping?.sku || "",

        weightKg:
          product.shipping?.weightKg ?? "",

        lengthCm:
          product.shipping?.lengthCm ?? "",

        breadthCm:
          product.shipping?.breadthCm ?? "",

        heightCm:
          product.shipping?.heightCm ?? "",
      },

      isFeatured:
        product.isFeatured,

      isBestseller:
        product.isBestseller,

      isNew:
        product.isNew,

      isOnSale:
        product.isOnSale,
    });

    setSubcats(
      CATEGORIES[product.category] || []
    );

    setEditing(product._id);

    setShowForm(true);

    // Form tak scroll karwa denge
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ─────────────────────────────────────────
  // Cancel edit
  // ─────────────────────────────────────────

  const cancelEdit = () => {
    if (saving) {
      return;
    }

    setForm(empty);

    setEditing(null);

    setShowForm(false);

    setSubcats([]);
  };

  // ─────────────────────────────────────────
  // Add Product button
  // ─────────────────────────────────────────

  const toggleAddProduct = () => {
    if (saving) {
      return;
    }

    // Agar form already open hai,
    // to close kar do.
    if (showForm) {
      setForm(empty);

      setEditing(null);

      setSubcats([]);

      setShowForm(false);

      return;
    }

    // Fresh Create form
    setForm(empty);

    setEditing(null);

    setSubcats([]);

    setShowForm(true);
  };

  return (
    <div className="products-page">
      {/* =====================================
          PAGE HEADER
          ===================================== */}

      <div
        className="products-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h2 className="products-page-title">
          Products
        </h2>

        <div className="products-page-actions">
          <button
            type="button"
            onClick={toggleAddProduct}
            disabled={saving}
            className="products-page-add-button"
            style={{
              ...btnStyle,

              opacity: saving ? 0.6 : 1,

              cursor: saving
                ? "not-allowed"
                : "pointer",
            }}
          >
            {showForm
              ? "Cancel"
              : "+ Add Product"}
          </button>
        </div>
      </div>

      {/* =====================================
          CREATE / UPDATE FORM
          ===================================== */}

      {showForm && (
        <form
          className="products-form"
          onSubmit={handleSubmit}
          style={{
            background: "#fff",

            padding: 24,

            borderRadius: 12,

            marginBottom: 24,

            display: "grid",

            gridTemplateColumns:
              "1fr 1fr",

            gap: 16,
          }}
        >
          {/* =====================
              NAME
              ===================== */}

          <div className="products-form-field">
            <label style={labelStyle}>
              Name *
            </label>

            <input
              value={form.name}
              onChange={(event) =>
                handleNameChange(
                  event.target.value
                )
              }
              style={inputStyle}
              placeholder="Product name"
              required
              disabled={saving}
            />
          </div>

          {/* =====================
              SLUG
              ===================== */}

          <div className="products-form-field">
            <label style={labelStyle}>
              Slug (auto-generated)
            </label>

            <input
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  slug: event.target.value,
                }))
              }
              style={{
                ...inputStyle,
                color: "#6b7280",
              }}
              placeholder="auto-generated-slug"
              disabled={saving}
            />
          </div>

          {/* =====================
              CATEGORY
              ===================== */}

          <div className="products-form-field">
            <label style={labelStyle}>
              Category *
            </label>

            <select
              value={form.category}
              onChange={(event) =>
                handleCategoryChange(
                  event.target.value
                )
              }
              style={inputStyle}
              required
              disabled={saving}
            >
              <option value="">
                — Select category —
              </option>

              {Object.keys(CATEGORIES).map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          </div>

          {/* =====================
              SUBCATEGORY
              ===================== */}

          <div className="products-form-field">
            <label style={labelStyle}>
              Subcategory
            </label>

            {subcats.length > 0 ? (
              <select
                value={form.subcategory}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    subcategory:
                      event.target.value,
                  }))
                }
                style={inputStyle}
                disabled={saving}
              >
                <option value="">
                  — Select subcategory —
                </option>

                {subcats.map(
                  (subcategory) => (
                    <option
                      key={subcategory}
                      value={subcategory}
                    >
                      {subcategory}
                    </option>
                  )
                )}
              </select>
            ) : (
              <input
                value={form.subcategory}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    subcategory:
                      event.target.value,
                  }))
                }
                style={{
                  ...inputStyle,

                  color: "#9ca3af",
                }}
                placeholder="No subcategories for this category"
                disabled={
                  !form.category ||
                  saving
                }
              />
            )}
          </div>

          {/* =====================
              PRICE
              ===================== */}

          <div className="products-form-field">
            <label style={labelStyle}>
              Price (₹) *
            </label>

            <input
              type="number"
              value={form.price}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  price:
                    event.target.value,
                }))
              }
              style={inputStyle}
              placeholder="e.g. 299"
              required
              min="0"
              step="0.01"
              disabled={saving}
            />
          </div>

          {/* =====================
              ORIGINAL PRICE
              ===================== */}

          <div className="products-form-field">
            <label style={labelStyle}>
              Original Price (₹){" "}
              <span
                style={{
                  color: "#9ca3af",

                  fontWeight: 400,
                }}
              >
                (for strike-through)
              </span>
            </label>

            <input
              type="number"
              value={form.originalPrice}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  originalPrice:
                    event.target.value,
                }))
              }
              style={inputStyle}
              placeholder="e.g. 399"
              min="0"
              step="0.01"
              disabled={saving}
            />
          </div>

          {/* =====================
              STOCK
              ===================== */}

          <div className="products-form-field">
            <label style={labelStyle}>
              Stock *
            </label>

            <input
              type="number"
              value={form.stock}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  stock:
                    event.target.value,
                }))
              }
              style={inputStyle}
              placeholder="e.g. 10"
              required
              min="0"
              step="1"
              disabled={saving}
            />
          </div>

          {/* =====================================
              SHIPPING
              ===================================== */}

          <fieldset
            className="products-shipping-fieldset products-form-wide"
            disabled={saving}
            style={{
              gridColumn: "span 2",

              margin: 0,

              padding: 16,

              borderRadius: 8,

              border: "1px solid #ddd",

              display: "grid",

              gridTemplateColumns:
                "1fr 1fr",

              gap: 16,
            }}
          >
            <legend
              style={{
                ...labelStyle,

                padding: "0 6px",
              }}
            >
              Shipping parcel data
            </legend>

            <p
              className="products-shipping-help"
              style={{
                gridColumn: "span 2",

                margin: 0,

                color: "#6b7280",

                fontSize: 12,
              }}
            >
              Used for automatic Shiprocket
              fulfillment. Measurements are
              required for new products; legacy
              products can remain blank until
              their parcel data is known.
            </p>

            {/* SKU */}

            <div className="products-shipping-field">
              <label style={labelStyle}>
                SKU{" "}
                <span
                  style={{
                    color: "#9ca3af",

                    fontWeight: 400,
                  }}
                >
                  (optional)
                </span>
              </label>

              <input
                value={form.shipping.sku}
                onChange={(event) =>
                  updateShippingField(
                    "sku",

                    event.target.value
                  )
                }
                style={inputStyle}
                placeholder="e.g. PC-KEYRING-001"
                maxLength={100}
              />
            </div>

            {/* Weight */}

            <div className="products-shipping-field">
              <label style={labelStyle}>
                Weight (kg)
                {!editing && " *"}
              </label>

              <input
                type="number"
                min="0.001"
                step="0.001"
                value={
                  form.shipping.weightKg
                }
                onChange={(event) =>
                  updateShippingField(
                    "weightKg",

                    event.target.value
                  )
                }
                style={inputStyle}
                placeholder="e.g. 0.25"
                required={!editing}
              />
            </div>

            {/* Length */}

            <div className="products-shipping-field">
              <label style={labelStyle}>
                Length (cm)
                {!editing && " *"}
              </label>

              <input
                type="number"
                min="0.1"
                step="0.1"
                value={
                  form.shipping.lengthCm
                }
                onChange={(event) =>
                  updateShippingField(
                    "lengthCm",

                    event.target.value
                  )
                }
                style={inputStyle}
                placeholder="e.g. 15"
                required={!editing}
              />
            </div>

            {/* Breadth */}

            <div className="products-shipping-field">
              <label style={labelStyle}>
                Breadth (cm)
                {!editing && " *"}
              </label>

              <input
                type="number"
                min="0.1"
                step="0.1"
                value={
                  form.shipping.breadthCm
                }
                onChange={(event) =>
                  updateShippingField(
                    "breadthCm",

                    event.target.value
                  )
                }
                style={inputStyle}
                placeholder="e.g. 10"
                required={!editing}
              />
            </div>

            {/* Height */}

            <div className="products-shipping-field">
              <label style={labelStyle}>
                Height (cm)
                {!editing && " *"}
              </label>

              <input
                type="number"
                min="0.1"
                step="0.1"
                value={
                  form.shipping.heightCm
                }
                onChange={(event) =>
                  updateShippingField(
                    "heightCm",

                    event.target.value
                  )
                }
                style={inputStyle}
                placeholder="e.g. 5"
                required={!editing}
              />
            </div>
          </fieldset>

          {/* =====================================
              IMAGES
              ===================================== */}

          <div className="products-form-field">
            <label style={labelStyle}>
              Image URLs{" "}
              <span
                style={{
                  fontWeight: 400,

                  color: "#9ca3af",
                }}
              >
                (comma-separated)
              </span>
            </label>

            <input
              value={form.images}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  images:
                    event.target.value,
                }))
              }
              style={inputStyle}
              placeholder="https://..., https://..."
              disabled={saving}
            />
          </div>

          {/* =====================================
              DESCRIPTION
              ===================================== */}

          <div
            className="products-form-wide"
            style={{
              gridColumn: "span 2",
            }}
          >
            <label style={labelStyle}>
              Description *
            </label>

            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  description:
                    event.target.value,
                }))
              }
              style={{
                ...inputStyle,

                height: 80,
              }}
              required
              disabled={saving}
            />
          </div>

          {/* =====================================
              PRODUCT FLAGS
              ===================================== */}

          <div
            className="products-flags-section products-form-wide"
            style={{
              gridColumn: "span 2",
            }}
          >
            <label
              style={{
                ...labelStyle,

                marginBottom: 10,
              }}
            >
              Product flags
            </label>

            <div
              className="products-flag-options products-flags"
              style={{
                display: "flex",

                gap: 20,

                flexWrap: "wrap",
              }}
            >
              {[
                [
                  "isFeatured",
                  "⭐ Featured",
                ],

                [
                  "isBestseller",
                  "🏆 Bestseller",
                ],

                [
                  "isNew",
                  "🆕 New Arrival",
                ],

                [
                  "isOnSale",
                  "🔖 On Sale",
                ],
              ].map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",

                    alignItems: "center",

                    gap: 8,

                    cursor: saving
                      ? "not-allowed"
                      : "pointer",

                    fontSize: 13,

                    fontWeight: 500,

                    padding:
                      "8px 14px",

                    background: form[key]
                      ? "#ede9fe"
                      : "#f9fafb",

                    border: `1px solid ${
                      form[key]
                        ? "#7c3aed"
                        : "#e5e7eb"
                    }`,

                    borderRadius: 8,

                    transition:
                      "all 0.15s",

                    color: form[key]
                      ? "#7c3aed"
                      : "#374151",

                    opacity: saving
                      ? 0.7
                      : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form[key]}
                    disabled={saving}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          [key]:
                            event.target
                              .checked,
                        })
                      )
                    }
                    style={{
                      accentColor:
                        "#7c3aed",
                    }}
                  />

                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* =====================================
              IMAGE PREVIEW
              ===================================== */}

          {form.images && (
            <div
              className="products-image-preview products-form-wide"
              style={{
                gridColumn: "span 2",
              }}
            >
              <label style={labelStyle}>
                Image Preview
              </label>

              <div
                style={{
                  display: "flex",

                  gap: 8,

                  flexWrap: "wrap",
                }}
              >
                {form.images
                  .split(",")
                  .map((url) => url.trim())
                  .filter(Boolean)
                  .map((url, index) => (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt={`preview ${
                        index + 1
                      }`}
                      style={{
                        width: 80,

                        height: 80,

                        objectFit:
                          "cover",

                        borderRadius: 8,

                        border:
                          "1px solid #e5e7eb",
                      }}
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* =====================================
              CREATE / UPDATE BUTTON
              ===================================== */}

          <div
            className="products-form-actions products-form-wide"
            style={{
              gridColumn: "span 2",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                ...btnStyle,

                display: "inline-flex",

                alignItems: "center",

                justifyContent:
                  "center",

                gap: 8,

                minWidth: 160,

                opacity: saving
                  ? 0.75
                  : 1,

                cursor: saving
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {saving ? (
                <>
                  <Loader type="button" />

                  {editing
                    ? "Updating..."
                    : "Creating..."}
                </>
              ) : editing ? (
                "Update Product"
              ) : (
                "Create Product"
              )}
            </button>

            {editing && (
              <button
                type="button"
                disabled={saving}
                onClick={cancelEdit}
                style={{
                  ...btnStyle,

                  background:
                    "#6b7280",

                  marginLeft: 10,

                  opacity: saving
                    ? 0.6
                    : 1,

                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {/* =====================================
          INITIAL PRODUCTS LOADING
          ===================================== */}

      {loading ? (
        <Loader
          type="table"
          columns={7}
          rows={6}
        />
      ) : (
        <>
          {/* =================================
              DESKTOP PRODUCTS TABLE
              ================================= */}

          <div
            className="products-table-wrap desktop-only"
            style={{
              background: "#fff",

              borderRadius: 12,

              overflow: "hidden",
            }}
          >
            <table
              className="products-table"
              style={{
                width: "100%",

                borderCollapse:
                  "collapse",
              }}
            >
              <thead
                style={{
                  background:
                    "#f3f4f6",
                }}
              >
                <tr>
                  {[
                    "Name",
                    "Category",
                    "Subcategory",
                    "Price",
                    "Stock",
                    "Flags",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={thStyle}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {products.map(
                  (product) => (
                    <tr
                      key={product._id}
                      style={{
                        borderBottom:
                          "1px solid #f3f4f6",
                      }}
                    >
                      {/* NAME */}

                      <td style={tdStyle}>
                        <div
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {product.name}
                        </div>

                        <div
                          style={{
                            fontSize: 11,

                            color:
                              "#9ca3af",
                          }}
                        >
                          {product.slug}
                        </div>
                      </td>

                      {/* CATEGORY */}

                      <td style={tdStyle}>
                        {
                          product.category
                        }
                      </td>

                      {/* SUBCATEGORY */}

                      <td style={tdStyle}>
                        {product.subcategory || (
                          <span
                            style={{
                              color:
                                "#d1d5db",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* PRICE */}

                      <td style={tdStyle}>
                        <strong>
                          ₹{product.price}
                        </strong>

                        {product.originalPrice && (
                          <div
                            style={{
                              fontSize: 11,

                              color:
                                "#9ca3af",

                              textDecoration:
                                "line-through",
                            }}
                          >
                            ₹
                            {
                              product.originalPrice
                            }
                          </div>
                        )}
                      </td>

                      {/* STOCK */}

                      <td style={tdStyle}>
                        <span
                          style={{
                            padding:
                              "3px 8px",

                            borderRadius: 20,

                            fontSize: 11,

                            background:
                              product.stock >
                              5
                                ? "#d1fae5"
                                : product.stock >
                                    0
                                  ? "#fef3c7"
                                  : "#fee2e2",

                            color:
                              product.stock >
                              5
                                ? "#065f46"
                                : product.stock >
                                    0
                                  ? "#92400e"
                                  : "#991b1b",

                            fontWeight: 600,
                          }}
                        >
                          {product.stock > 0
                            ? `${product.stock} left`
                            : "Out of stock"}
                        </span>
                      </td>

                      {/* FLAGS */}

                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",

                            gap: 4,

                            flexWrap:
                              "wrap",
                          }}
                        >
                          {product.isFeatured && (
                            <span
                              style={flagStyle(
                                "#7c3aed"
                              )}
                              title="Featured"
                            >
                              ⭐
                            </span>
                          )}

                          {product.isBestseller && (
                            <span
                              style={flagStyle(
                                "#f59e0b"
                              )}
                              title="Bestseller"
                            >
                              🏆
                            </span>
                          )}

                          {product.isNew && (
                            <span
                              style={flagStyle(
                                "#10b981"
                              )}
                              title="New arrival"
                            >
                              🆕
                            </span>
                          )}

                          {product.isOnSale && (
                            <span
                              style={flagStyle(
                                "#ef4444"
                              )}
                              title="On sale"
                            >
                              🔖
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS */}

                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",

                            gap: 6,

                            alignItems:
                              "center",

                            flexWrap:
                              "wrap",
                          }}
                        >
                          {/* EDIT */}

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(
                                product
                              )
                            }
                            disabled={
                              deletingId ===
                                product._id ||
                              saving
                            }
                            style={{
                              ...smallBtn,

                              background:
                                "#0ea5e9",

                              opacity:
                                deletingId ===
                                  product._id ||
                                saving
                                  ? 0.6
                                  : 1,

                              cursor:
                                deletingId ===
                                  product._id ||
                                saving
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            Edit
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                product._id
                              )
                            }
                            disabled={
                              deletingId !==
                              null
                            }
                            style={{
                              ...smallBtn,

                              background:
                                "#ef4444",

                              display:
                                "inline-flex",

                              alignItems:
                                "center",

                              justifyContent:
                                "center",

                              gap: 6,

                              minWidth: 76,

                              opacity:
                                deletingId ===
                                product._id
                                  ? 0.75
                                  : deletingId
                                    ? 0.5
                                    : 1,

                              cursor:
                                deletingId
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {deletingId ===
                            product._id ? (
                              <>
                                <Loader type="button" />

                                Deleting...
                              </>
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {products.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: 32,

                        textAlign:
                          "center",

                        color:
                          "#9ca3af",
                      }}
                    >
                      No products yet —
                      add your first
                      product!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* =================================
              MOBILE PRODUCT LIST
              ================================= */}

          <div
            className="products-mobile-list mobile-only"
            aria-label="Products"
          >
            {products.map(
              (product) => (
                <article
                  className="product-card"
                  key={product._id}
                >
                  {/* TOP */}

                  <div className="product-card-header product-card__top">
                    <div className="product-card-title-group">
                      <h3 className="product-card-title product-card__name">
                        {product.name}
                      </h3>

                      {product.slug && (
                        <p className="product-card-slug product-card__slug">
                          {
                            product.slug
                          }
                        </p>
                      )}
                    </div>

                    <span
                      className="product-card-stock-badge product-card__stock"
                      style={{
                        padding:
                          "3px 8px",

                        borderRadius: 20,

                        fontSize: 11,

                        background:
                          product.stock >
                          5
                            ? "#d1fae5"
                            : product.stock >
                                0
                              ? "#fef3c7"
                              : "#fee2e2",

                        color:
                          product.stock >
                          5
                            ? "#065f46"
                            : product.stock >
                                0
                              ? "#92400e"
                              : "#991b1b",

                        fontWeight: 600,
                      }}
                    >
                      {product.stock > 0
                        ? `${product.stock} left`
                        : "Out of stock"}
                    </span>
                  </div>

                  {/* PRICE + CATEGORY */}

                  <div className="product-card-details product-card__price-row">
                    <div className="product-card-price product-card__price">
                      <strong>
                        ₹{product.price}
                      </strong>

                      {product.originalPrice && (
                        <span className="product-card-original-price product-card__original-price">
                          ₹
                          {
                            product.originalPrice
                          }
                        </span>
                      )}
                    </div>

                    <div className="product-card-category product-card__meta">
                      <span>
                        {
                          product.category
                        }
                      </span>

                      {product.subcategory && (
                        <span className="product-card-subcategory">
                          {
                            product.subcategory
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  {/* FLAGS */}

                  <div
                    className="product-card-flags product-card__flags"
                    aria-label="Product flags"
                  >
                    {product.isFeatured && (
                      <span
                        style={flagStyle(
                          "#7c3aed"
                        )}
                        title="Featured"
                        aria-label="Featured"
                      >
                        ⭐
                      </span>
                    )}

                    {product.isBestseller && (
                      <span
                        style={flagStyle(
                          "#f59e0b"
                        )}
                        title="Bestseller"
                        aria-label="Bestseller"
                      >
                        🏆
                      </span>
                    )}

                    {product.isNew && (
                      <span
                        style={flagStyle(
                          "#10b981"
                        )}
                        title="New arrival"
                        aria-label="New arrival"
                      >
                        🆕
                      </span>
                    )}

                    {product.isOnSale && (
                      <span
                        style={flagStyle(
                          "#ef4444"
                        )}
                        title="On sale"
                        aria-label="On sale"
                      >
                        🔖
                      </span>
                    )}
                  </div>

                  {/* ACTIONS */}

                  <div className="product-card-actions product-card__actions">
                    {/* EDIT */}

                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          product
                        )
                      }
                      disabled={
                        deletingId ===
                          product._id ||
                        saving
                      }
                      className="product-card-edit-button"
                      style={{
                        ...smallBtn,

                        background:
                          "#0ea5e9",

                        opacity:
                          deletingId ===
                            product._id ||
                          saving
                            ? 0.6
                            : 1,
                      }}
                    >
                      Edit
                    </button>

                    {/* DELETE */}

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          product._id
                        )
                      }
                      disabled={
                        deletingId !==
                        null
                      }
                      className="product-card-delete-button"
                      style={{
                        ...smallBtn,

                        background:
                          "#ef4444",

                        display:
                          "inline-flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        gap: 6,

                        opacity:
                          deletingId ===
                          product._id
                            ? 0.75
                            : deletingId
                              ? 0.5
                              : 1,

                        cursor:
                          deletingId
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {deletingId ===
                      product._id ? (
                        <>
                          <Loader type="button" />

                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </div>
                </article>
              )
            )}

            {products.length ===
              0 && (
              <div className="products-mobile-empty">
                No products yet — add
                your first product!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const flagStyle = (color) => ({
  padding: "2px 6px",

  borderRadius: 6,

  fontSize: 12,

  background: `${color}15`,

  border: `1px solid ${color}30`,
});

const inputStyle = {
  width: "100%",

  padding: 10,

  borderRadius: 8,

  border: "1px solid #ddd",

  fontSize: 14,

  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",

  marginBottom: 4,

  fontSize: 13,

  color: "#374151",

  fontWeight: 600,
};

const btnStyle = {
  padding: "10px 20px",

  background: "#7c3aed",

  color: "#fff",

  border: "none",

  borderRadius: 8,

  cursor: "pointer",

  fontSize: 14,
};

const smallBtn = {
  padding: "6px 12px",

  color: "#fff",

  border: "none",

  borderRadius: 6,

  cursor: "pointer",

  fontSize: 13,

  marginRight: 6,
};

const thStyle = {
  padding: "12px 16px",

  textAlign: "left",

  fontSize: 13,

  fontWeight: 600,

  color: "#374151",
};

const tdStyle = {
  padding: "12px 16px",

  fontSize: 14,

  color: "#374151",
};