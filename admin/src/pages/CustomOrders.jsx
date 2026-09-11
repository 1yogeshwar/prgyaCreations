import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Loader from "../components/Loader";
import "./CustomOrders.css";

const API = process.env.REACT_APP_API_URL;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin-token")}`,
});

const STATUS = [
  "pending",
  "reviewing",
  "quoted",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
];

const statusClasses = {
  pending: "custom-status--pending",
  reviewing: "custom-status--reviewing",
  quoted: "custom-status--quoted",
  confirmed: "custom-status--confirmed",
  in_progress: "custom-status--in-progress",
  completed: "custom-status--completed",
  cancelled: "custom-status--cancelled",
};

export default function CustomOrders() {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [quoteForm, setQuoteForm] = useState({});

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // ==========================================
  // LOAD CUSTOM ORDERS
  // ==========================================

  const load = async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await axios.get(
        `${API}/custom-orders`,
        {
          headers: authHeader(),
        }
      );

      setOrders(response.data);
    } catch (error) {
      console.error("Custom orders load error:", error);

      toast.error(
        error.response?.data?.message ||
          "Unable to load custom orders"
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

  // ==========================================
  // UPDATE ORDER
  // ==========================================

  const handleUpdate = async (id) => {
    if (updatingId) {
      return;
    }

    const changes = quoteForm[id];

    if (!changes || Object.keys(changes).length === 0) {
      toast.error("Make a change before updating.");
      return;
    }

    try {
      setUpdatingId(id);

      await axios.put(
        `${API}/custom-orders/${id}`,
        changes,
        {
          headers: authHeader(),
        }
      );

      toast.success("Custom order updated!");

      // Remove stale local form values for this order
      setQuoteForm((current) => {
        const {
          [id]: ignored,
          ...remaining
        } = current;

        return remaining;
      });

      // Silent refresh
      await load();
    } catch (error) {
      console.error("Custom order update error:", error);

      toast.error(
        error.response?.data?.message ||
          "Update failed"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // ==========================================
  // FORM FIELD
  // ==========================================

  const setField = (id, field, value) => {
    setQuoteForm((current) => ({
      ...current,

      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
  };

  // ==========================================
  // EXPAND / COLLAPSE
  // ==========================================

  const toggleOrder = (id) => {
    setExpanded((current) =>
      current === id ? null : id
    );
  };

  return (
    <div className="admin-page custom-orders-page">
      {/* =====================================
          HEADER
          ===================================== */}

      <div className="custom-orders-header">
        <div>
          <h2 className="admin-page-title">
            Custom Orders
          </h2>

          <p className="custom-orders-intro">
            Review customer custom requests, set a
            price and update status.
          </p>
        </div>
      </div>

      {/* =====================================
          INITIAL LOADING
          ===================================== */}

      {loading ? (
        <Loader
          type="table"
          columns={4}
          rows={6}
        />
      ) : (
        <>
          {/* =================================
              EMPTY STATE
              ================================= */}

          {orders.length === 0 && (
            <div className="custom-orders-empty">
              <span className="custom-orders-empty__icon">
                🎨
              </span>

              <p>No custom orders yet</p>
            </div>
          )}

          {/* =================================
              ORDERS LIST
              ================================= */}

          <div className="custom-orders-list">
            {orders.map((order) => {
              const isExpanded =
                expanded === order._id;

              const isUpdating =
                updatingId === order._id;

              const statusClass =
                statusClasses[order.status] ||
                statusClasses.pending;

              return (
                <article
                  key={order._id}
                  className={`custom-order-card ${
                    isExpanded
                      ? "custom-order-card--expanded"
                      : ""
                  }`}
                >
                  {/* =========================
                      ORDER SUMMARY
                      ========================= */}

                  <div
                    className="custom-order-row"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-controls={`custom-order-details-${order._id}`}
                    onClick={() =>
                      toggleOrder(order._id)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();

                        toggleOrder(order._id);
                      }
                    }}
                  >
                    {/* CUSTOMER */}

                    <div className="custom-order-customer">
                      <p className="custom-order-customer__name">
                        {order.name}
                      </p>

                      <p className="custom-order-muted">
                        {order.email}
                      </p>

                      <p className="custom-order-muted">
                        {order.phone}
                      </p>
                    </div>

                    {/* REQUEST */}

                    <div className="custom-order-request">
                      <p className="custom-order-request__title">
                        {order.productReference ||
                          order.category ||
                          "General custom"}
                      </p>

                      <p className="custom-order-muted">
                        {order.description?.length > 60
                          ? `${order.description.slice(
                              0,
                              60
                            )}...`
                          : order.description || "—"}
                      </p>
                    </div>

                    {/* PRICE */}

                    <div className="custom-order-price">
                      {order.quotedPrice ? (
                        <p className="custom-order-price__value">
                          ₹{order.quotedPrice}
                        </p>
                      ) : (
                        <p className="custom-order-price__empty">
                          Not quoted
                        </p>
                      )}
                    </div>

                    {/* STATUS */}

                    <div>
                      <span
                        className={`custom-status ${statusClass}`}
                      >
                        {(order.status || "pending").replace(
                          /_/g,
                          " "
                        )}
                      </span>
                    </div>

                    {/* ARROW */}

                    <span
                      className={`custom-order-arrow ${
                        isExpanded
                          ? "custom-order-arrow--expanded"
                          : ""
                      }`}
                      aria-hidden="true"
                    >
                      ▼
                    </span>
                  </div>

                  {/* =========================
                      EXPANDED CONTENT
                      ========================= */}

                  {isExpanded && (
                    <div
                      id={`custom-order-details-${order._id}`}
                      className="custom-order-expanded"
                    >
                      <div className="custom-order-details-grid">
                        {/* =====================
                            REQUEST DETAILS
                            ===================== */}

                        <section className="custom-order-detail-card">
                          <p className="custom-order-card-label">
                            📋 Request Details
                          </p>

                          <p className="custom-order-detail-text">
                            <strong>Category:</strong>{" "}
                            {order.category || "—"}
                          </p>

                          <p className="custom-order-detail-text">
                            <strong>Product ref:</strong>{" "}
                            {order.productReference || "—"}
                          </p>

                          <p className="custom-order-detail-text">
                            <strong>Description:</strong>{" "}
                            {order.description || "—"}
                          </p>

                          {order.parameters?.size && (
                            <p className="custom-order-detail-text">
                              <strong>Size:</strong>{" "}
                              {order.parameters.size}
                            </p>
                          )}

                          {order.parameters?.color && (
                            <p className="custom-order-detail-text">
                              <strong>Color:</strong>{" "}
                              {order.parameters.color}
                            </p>
                          )}

                          {order.parameters?.name && (
                            <p className="custom-order-detail-text">
                              <strong>Name/Text:</strong>{" "}
                              {order.parameters.name}
                            </p>
                          )}

                          {order.parameters?.quantity && (
                            <p className="custom-order-detail-text">
                              <strong>Quantity:</strong>{" "}
                              {order.parameters.quantity}
                            </p>
                          )}

                          {order.parameters?.extraNotes && (
                            <p className="custom-order-detail-text">
                              <strong>Extra notes:</strong>{" "}
                              {
                                order.parameters
                                  .extraNotes
                              }
                            </p>
                          )}

                          {/* REFERENCE IMAGE */}

                          {order.referenceImage && (
                            <div className="custom-order-reference">
                              <p className="custom-order-detail-text">
                                <strong>
                                  Reference image:
                                </strong>
                              </p>

                              <img
                                src={order.referenceImage}
                                alt="Customer reference"
                                className="custom-order-reference__image"
                              />
                            </div>
                          )}

                          {/* RECEIVED DATE */}

                          <p className="custom-order-received">
                            Received:{" "}
                            {new Date(
                              order.createdAt
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </section>

                        {/* =====================
                            ADMIN ACTION
                            ===================== */}

                        <section className="custom-order-admin-card">
                          <p className="custom-order-card-label">
                            ⚙️ Admin Action
                          </p>

                          {/* STATUS */}

                          <div className="custom-order-field">
                            <label
                              htmlFor={`custom-status-${order._id}`}
                            >
                              Update Status
                            </label>

                            <select
                              id={`custom-status-${order._id}`}
                              value={
                                quoteForm[order._id]
                                  ?.status ??
                                order.status
                              }
                              disabled={isUpdating}
                              onChange={(event) =>
                                setField(
                                  order._id,
                                  "status",
                                  event.target.value
                                )
                              }
                            >
                              {STATUS.map((status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {status.replace(
                                    /_/g,
                                    " "
                                  )}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* PRICE */}

                          <div className="custom-order-field">
                            <label
                              htmlFor={`custom-price-${order._id}`}
                            >
                              Quoted Price (₹)
                            </label>

                            <input
                              id={`custom-price-${order._id}`}
                              type="number"
                              min="0"
                              step="1"
                              value={
                                quoteForm[order._id]
                                  ?.quotedPrice ??
                                order.quotedPrice ??
                                ""
                              }
                              placeholder="e.g. 499"
                              disabled={isUpdating}
                              onChange={(event) =>
                                setField(
                                  order._id,
                                  "quotedPrice",
                                  event.target.value === ""
                                    ? ""
                                    : Number(
                                        event.target.value
                                      )
                                )
                              }
                            />
                          </div>

                          {/* MESSAGE */}

                          <div className="custom-order-field">
                            <label
                              htmlFor={`custom-note-${order._id}`}
                            >
                              Message to Customer
                            </label>

                            <textarea
                              id={`custom-note-${order._id}`}
                              value={
                                quoteForm[order._id]
                                  ?.adminNote ??
                                order.adminNote ??
                                ""
                              }
                              placeholder="e.g. Hi! Your custom keyring will cost ₹499 and take 5 days..."
                              disabled={isUpdating}
                              onChange={(event) =>
                                setField(
                                  order._id,
                                  "adminNote",
                                  event.target.value
                                )
                              }
                            />
                          </div>

                          {/* =====================
                              PURPLE ACTION BUTTON
                              ===================== */}

                          <button
                            type="button"
                            disabled={
                              isUpdating ||
                              (updatingId !== null &&
                                !isUpdating)
                            }
                            onClick={(event) => {
                              event.stopPropagation();

                              handleUpdate(order._id);
                            }}
                            className="custom-order-action-btn"
                          >
                            <span className="custom-order-action-btn__fold" />

                            <span className="custom-order-action-btn__inner">
                              {isUpdating ? (
                                <>
                                  <Loader type="button" />

                                  <span>
                                    Updating...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="custom-order-action-btn__icon">
                                    ⚡
                                  </span>

                                  <span>
                                    Save & Update
                                  </span>
                                </>
                              )}
                            </span>

                            <span className="custom-order-action-btn__points">
                              <span className="custom-order-action-btn__point custom-order-action-btn__point--1" />
                              <span className="custom-order-action-btn__point custom-order-action-btn__point--2" />
                              <span className="custom-order-action-btn__point custom-order-action-btn__point--3" />
                              <span className="custom-order-action-btn__point custom-order-action-btn__point--4" />
                            </span>
                          </button>

                          {/* LAST MESSAGE */}

                          {order.adminNote && (
                            <div className="custom-order-last-message">
                              <strong>
                                Last message sent:
                              </strong>

                              <p>
                                {order.adminNote}
                              </p>
                            </div>
                          )}
                        </section>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}