import { Fragment, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Loader from "../components/Loader";
import "./Orders.css";

const API = process.env.REACT_APP_API_URL;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin-token")}`,
});

const STATUS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

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
  const value = values.find(
    (candidate) =>
      (typeof candidate === "string" ||
        typeof candidate === "number") &&
      String(candidate).trim()
  );

  return value === undefined
    ? ""
    : String(value).trim();
};

const friendlyShippingStatus = (
  status,
  fallback = "Not started"
) => {
  const rawStatus = firstText(status);

  if (!rawStatus) {
    return fallback;
  }

  const normalized = rawStatus
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (SHIPPING_STATUS_LABELS[normalized]) {
    return SHIPPING_STATUS_LABELS[normalized];
  }

  return rawStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const shipmentDetails = (
  order,
  localFailure = ""
) => {
  const shiprocket = order?.shiprocket || {};

  const shipping =
    order?.shippingDetails ||
    order?.shippingInfo ||
    {};

  const rawStatus = firstText(
    shiprocket.shippingStatus,
    shiprocket.status,
    shipping.status,
    order?.shippingStatus
  );

  const normalizedStatus = rawStatus
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

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

  const lockAcquiredAt = firstText(
    shiprocket.lockAcquiredAt
  );

  const lockAcquiredAtMs =
    Date.parse(lockAcquiredAt);

  const staleInProgress =
    automationState === "IN_PROGRESS" &&
    Number.isFinite(lockAcquiredAtMs) &&
    Date.now() - lockAcquiredAtMs >=
      FULFILLMENT_LOCK_MAX_AGE_MS;

  const displayFailureReason =
    failureReason ||
    (staleInProgress
      ? "The previous fulfillment request appears stalled. Retry to resume it safely."
      : "");

  const failed =
    Boolean(displayFailureReason) ||
    [
      "DELIVERY_FAILED",
      "SHIPPING_ACTION_REQUIRED",
      "FAILED",
      "ERROR",
    ].includes(normalizedStatus) ||
    [
      "ACTION_REQUIRED",
      "PENDING_RETRY",
      "FAILED",
      "ERROR",
    ].includes(automationState);

  const awbCode = firstText(
    shiprocket.awbCode,
    shiprocket.awb,
    shipping.awbCode,
    shipping.awb
  );

  const shipmentId = firstText(
    shiprocket.shipmentId,
    shiprocket.shipment_id,
    shipping.shipmentId,
    shipping.shipment_id
  );

  const shiprocketOrderId = firstText(
    shiprocket.orderId,
    shiprocket.order_id,
    shipping.orderId,
    shipping.order_id
  );

  const pickupStatus =
    firstText(
      shiprocket.pickupStatus,
      shiprocket.pickup?.status,
      shipping.pickupStatus,
      shipping.pickup?.status,
      shiprocket.pickupScheduled
        ? "Scheduled"
        : "",
      shipping.pickupScheduled
        ? "Scheduled"
        : ""
    ) || "Not scheduled";

  const pickupScheduled = [
    "SCHEDULED",
    "PICKUP_SCHEDULED",
  ].includes(
    pickupStatus
      .toUpperCase()
      .replace(/[\s-]+/g, "_")
  );

  const hasShipment = Boolean(
    awbCode ||
      shipmentId ||
      shiprocketOrderId ||
      automationState === "COMPLETED"
  );

  return {
    awbCode,

    shipmentId,

    shiprocketOrderId,

    courierName: firstText(
      shiprocket.courierName,
      shiprocket.courier,
      shipping.courierName,
      shipping.courier
    ),

    pickupStatus,

    trackingUrl: firstText(
      shiprocket.trackingUrl,
      shiprocket.tracking_url,
      shipping.trackingUrl,
      shipping.tracking_url
    ),

    status: friendlyShippingStatus(
      rawStatus,
      failed
        ? "Shipping action required"
        : "Shipment created"
    ),

    failureReason: displayFailureReason,

    failed,

    processing:
      automationState === "IN_PROGRESS" &&
      !staleInProgress,

    hasShipment,

    needsResume:
      !failed &&
      hasShipment &&
      (!awbCode || !pickupScheduled),
  };
};

const paymentMethodLabel = (method) => {
  if (method === "cod") {
    return "💵 COD";
  }

  if (method === "phone_confirm") {
    return "📞 Phone";
  }

  if (method === "online") {
    return "💳 Online";
  }

  return "";
};

const paymentStatusClass = (
  paymentStatus
) => {
  if (paymentStatus === "paid") {
    return "orders-payment--paid";
  }

  if (
    paymentStatus ===
    "awaiting_confirmation"
  ) {
    return "orders-payment--awaiting";
  }

  if (paymentStatus === "failed") {
    return "orders-payment--failed";
  }

  return "orders-payment--default";
};

const ShiprocketSection = ({
  order,
  isProcessing,
  localFailure,
  onShip,
}) => {
  const shipment = shipmentDetails(
    order,
    localFailure
  );

  return (
    <div className="order-card order-shiprocket-section">
      <p className="order-card-label">
        🚚 Shipping via Shiprocket
      </p>

      {isProcessing ||
      shipment.processing ? (
        <button
          type="button"
          disabled
          className="order-small-btn order-ship-btn order-ship-btn--disabled"
        >
          <Loader type="button" />
          Processing shipment...
        </button>
      ) : shipment.failed ? (
        <div>
          <p className="order-shipping-error-title">
            Shipping needs attention
          </p>

          <p className="order-shipping-error-text">
            {shipment.failureReason ||
              "Shiprocket requires manual action before this shipment can continue."}
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShip(order._id);
            }}
            className="order-small-btn order-ship-btn order-ship-btn--danger"
          >
            Retry Shiprocket
          </button>
        </div>
      ) : shipment.hasShipment ? (
        <div className="order-shipment-info">
          <div>
            <p className="order-shipment-info-label">
              Courier
            </p>

            <p className="order-shipment-info-value">
              {shipment.courierName ||
                "—"}
            </p>
          </div>

          <div>
            <p className="order-shipment-info-label">
              AWB
            </p>

            <p className="order-shipment-awb">
              {shipment.awbCode || "—"}
            </p>
          </div>

          <div>
            <p className="order-shipment-info-label">
              Pickup status
            </p>

            <span className="orders-badge orders-badge--pickup">
              {friendlyShippingStatus(
                shipment.pickupStatus,
                "Not scheduled"
              )}
            </span>
          </div>

          <div>
            <p className="order-shipment-info-label">
              Shipping status
            </p>

            <span className="orders-badge orders-badge--shipping">
              {shipment.status}
            </span>
          </div>

          {shipment.trackingUrl && (
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="order-small-btn order-ship-btn order-ship-btn--primary order-track-link"
            >
              Track Shipment →
            </a>
          )}

          {shipment.needsResume && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onShip(order._id);
              }}
              className="order-small-btn order-ship-btn order-ship-btn--primary"
            >
              Resume Shiprocket
            </button>
          )}
        </div>
      ) : (
        <div>
          <p className="order-shipment-empty-text">
            This order has not been shipped
            yet. Create a Shiprocket
            shipment and assign a courier.
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShip(order._id);
            }}
            className="order-small-btn order-ship-btn order-ship-btn--primary"
          >
            📦 Ship via Shiprocket
          </button>
        </div>
      )}
    </div>
  );
};

const OrderDetails = ({
  order,
  isProcessing,
  localFailure,
  onShip,
  onCopyToken,
}) => (
  <>
    <div className="order-details-grid">
      {/* TRACKING TOKEN */}

      <div className="order-card">
        <p className="order-card-label">
          📦 Tracking Token
        </p>

        <p className="order-tracking-token">
          {order.trackingToken || "—"}
        </p>

        {order.trackingToken && (
          <button
            type="button"
            onClick={() =>
              onCopyToken(
                order.trackingToken
              )
            }
            className="order-small-btn"
          >
            Copy Token
          </button>
        )}
      </div>

      {/* SHIPPING ADDRESS */}

      <div className="order-card">
        <p className="order-card-label">
          📍 Shipping Address
        </p>

        <p className="order-address">
          {
            order.shippingAddress
              ?.firstName
          }{" "}
          {
            order.shippingAddress
              ?.lastName
          }
          <br />

          {
            order.shippingAddress
              ?.address
          }
          <br />

          {
            order.shippingAddress
              ?.city
          }
          ,{" "}
          {
            order.shippingAddress
              ?.state
          }{" "}
          {
            order.shippingAddress
              ?.zip
          }
        </p>
      </div>

      {/* ITEMS */}

      <div className="order-card">
        <p className="order-card-label">
          🛍 Items (
          {order.items?.length || 0})
        </p>

        {order.items?.map(
          (item, index) => (
            <div
              className="order-item-row"
              key={`${item.name}-${index}`}
            >
              <span>
                {item.name} ×{" "}
                {item.quantity}
              </span>

              <span className="orders-strong order-nowrap">
                ₹
                {item.price *
                  item.quantity}
              </span>
            </div>
          )
        )}

        <div className="order-summary">
          <div className="order-summary-row">
            <span>Subtotal</span>

            <span>
              ₹{order.subtotal}
            </span>
          </div>

          <div className="order-summary-row">
            <span>Shipping</span>

            <span>
              {order.shipping === 0
                ? "Free"
                : `₹${order.shipping}`}
            </span>
          </div>

          <div className="order-summary-row">
            <span>Tax</span>

            <span>₹{order.tax}</span>
          </div>

          <div className="order-summary-row order-summary-row--total">
            <span>Total</span>

            <span>₹{order.total}</span>
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

    {order.paymentMethod ===
      "phone_confirm" &&
      order.paymentStatus !== "paid" && (
        <div className="order-alert order-alert--phone">
          📞{" "}
          <strong>
            Action needed:
          </strong>{" "}
          Call customer at{" "}
          <strong>
            {order.phone}
          </strong>{" "}
          to confirm payment. Share
          tracking token after
          confirmation.
        </div>
      )}

    {order.paymentMethod === "cod" && (
      <div className="order-alert order-alert--cod">
        💵{" "}
        <strong>COD Order:</strong>{" "}
        Collect ₹{order.total} at
        delivery from{" "}
        {
          order.shippingAddress
            ?.firstName
        }
        .
      </div>
    )}
  </>
);

const MobileOrderCard = ({
  order,
  expanded,
  isShipping,
  localFailure,
  onToggle,
  onUpdateStatus,
  onShip,
  onCopyToken,
}) => {
  const shipment = shipmentDetails(
    order,
    localFailure
  );

  const paymentLabel =
    order.paymentStatus ===
    "awaiting_confirmation"
      ? "awaiting"
      : order.paymentStatus;

  return (
    <article
      className={`order-mobile-card${
        expanded
          ? " order-mobile-card--expanded"
          : ""
      }`}
    >
      <div
        className="order-mobile-card__summary"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`order-details-${order._id}`}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="order-mobile-card__top">
          <span className="order-mobile-card__id">
            #
            {order._id
              .slice(-6)
              .toUpperCase()}
          </span>

          <span
            aria-hidden="true"
            className="order-mobile-expand-icon"
          >
            {expanded ? "⌃" : "⌄"}
          </span>
        </div>

        <p className="order-mobile-card__customer">
          {order.user?.name ||
            "Guest"}
        </p>

        <p className="order-mobile-card__email">
          {order.guestEmail ||
            order.user?.email ||
            "—"}
        </p>

        <div className="order-mobile-card__amount-row">
          <span className="order-mobile-card__amount">
            ₹{order.total}
          </span>

          <span className="order-mobile-card__payment-method">
            {paymentMethodLabel(
              order.paymentMethod
            )}
          </span>
        </div>

        <div className="order-mobile-card__status-row">
          <span
            className={`orders-badge ${paymentStatusClass(
              order.paymentStatus
            )}`}
          >
            {paymentLabel}
          </span>

          <span className="orders-badge orders-badge--order">
            {order.orderStatus}
          </span>

          {shipment.hasShipment && (
            <span className="orders-badge orders-badge--shipping">
              {shipment.status}
            </span>
          )}
        </div>
      </div>

      <div
        className="order-mobile-card__select-row"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <label
          htmlFor={`order-status-${order._id}`}
        >
          Update status
        </label>

        <select
          id={`order-status-${order._id}`}
          value={order.orderStatus}
          onChange={(event) =>
            onUpdateStatus(
              order._id,
              event.target.value
            )
          }
          className="order-status-select"
        >
          {STATUS.map((status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ))}
        </select>
      </div>

      {expanded && (
        <div
          id={`order-details-${order._id}`}
          className="order-mobile-card__details"
        >
          <OrderDetails
            order={order}
            isProcessing={
              isShipping
            }
            localFailure={
              localFailure
            }
            onShip={onShip}
            onCopyToken={
              onCopyToken
            }
          />
        </div>
      )}
    </article>
  );
};

export default function Orders() {
  const [orders, setOrders] =
    useState([]);

  const [expanded, setExpanded] =
    useState(null);

  const [shipping, setShipping] =
    useState(null);

  const [
    shippingErrors,
    setShippingErrors,
  ] = useState({});

  const [loading, setLoading] =
    useState(true);

  const [
    updatingStatusId,
    setUpdatingStatusId,
  ] = useState(null);

  // ─────────────────────────────────────────
  // LOAD ORDERS
  // ─────────────────────────────────────────

  const load = async ({
    showLoader = false,
  } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response =
        await axios.get(
          `${API}/admin/orders`,
          {
            headers: authHeader(),
          }
        );

      setOrders(response.data);
    } catch (error) {
      console.error(
        "Orders load error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to load orders"
      );

      throw error;
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load({
      showLoader: true,
    }).catch(() => {});
  }, []);

  // ─────────────────────────────────────────
  // UPDATE ORDER STATUS
  // ─────────────────────────────────────────

  const updateStatus = async (
    id,
    orderStatus
  ) => {
    try {
      setUpdatingStatusId(id);

      await axios.put(
        `${API}/admin/orders/${id}`,
        {
          orderStatus,
        },
        {
          headers: authHeader(),
        }
      );

      toast.success(
        "Status updated!"
      );

      await load();
    } catch (error) {
      console.error(
        "Order status update error:",
        error
      );

      toast.error(
        error.response?.data?.message ||
          "Unable to update order status"
      );
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ─────────────────────────────────────────
  // COPY TRACKING TOKEN
  // ─────────────────────────────────────────

  const copyToken = async (
    token
  ) => {
    try {
      await navigator.clipboard.writeText(
        token
      );

      toast.success(
        "Tracking token copied!"
      );
    } catch (error) {
      console.error(
        "Clipboard error:",
        error
      );

      toast.error(
        "Unable to copy tracking token"
      );
    }
  };

  // ─────────────────────────────────────────
  // SHIPROCKET
  // ─────────────────────────────────────────

  const shipViaShiprocket =
    async (orderId) => {
      if (shipping) {
        return;
      }

      setShipping(orderId);

      try {
        const response =
          await axios.post(
            `${API}/admin/shiprocket/ship/${orderId}`,
            {},
            {
              headers: authHeader(),
            }
          );

        const updatedOrder =
          response.data?.order ||
          response.data?.result
            ?.order ||
          response.data?.result;

        if (updatedOrder?._id) {
          setOrders(
            (currentOrders) =>
              currentOrders.map(
                (order) =>
                  order._id ===
                  updatedOrder._id
                    ? {
                        ...order,
                        ...updatedOrder,

                        shiprocket: {
                          ...order.shiprocket,
                          ...updatedOrder.shiprocket,
                        },
                      }
                    : order
              )
          );
        }

        setShippingErrors(
          (currentErrors) => {
            const {
              [orderId]:
                ignoredError,
              ...remainingErrors
            } = currentErrors;

            return remainingErrors;
          }
        );

        toast.success(
          "Shipment created on Shiprocket! 📦"
        );
      } catch (error) {
        const failureReason =
          firstText(
            error.response?.data
              ?.failureReason,

            error.response?.data
              ?.reason,

            error.response?.data
              ?.error?.message,

            error.response?.data
              ?.details?.message,

            error.response?.data
              ?.message,

            error.message
          ) ||
          "Shipping failed. Please try again.";

        setShippingErrors(
          (currentErrors) => ({
            ...currentErrors,

            [orderId]:
              failureReason,
          })
        );

        toast.error(
          failureReason
        );
      } finally {
        setShipping(null);

        try {
          await load();
        } catch {
          toast.error(
            "Shipment request finished, but the order list could not be refreshed."
          );
        }
      }
    };

  return (
    <div className="admin-page orders-page">
      <h2 className="admin-page-title orders-page-title">
        Orders
      </h2>

      <p className="orders-page-intro">
        Click any row to expand full
        details including tracking
        token.
      </p>

      {loading ? (
        <Loader
          type="table"
          columns={7}
          rows={6}
        />
      ) : (
        <>
          {/* =================================
              DESKTOP
              ================================= */}

          <div className="desktop-only orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  {[
                    "Order ID",
                    "Customer",
                    "Phone",
                    "Total",
                    "Payment",
                    "Order Status",
                    "Update Status",
                  ].map((header) => (
                    <th key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {orders.map(
                  (order) => {
                    const shipment =
                      shipmentDetails(
                        order,
                        shippingErrors[
                          order._id
                        ]
                      );

                    return (
                      <Fragment
                        key={
                          order._id
                        }
                      >
                        <tr
                          onClick={() =>
                            setExpanded(
                              expanded ===
                                order._id
                                ? null
                                : order._id
                            )
                          }
                          className={`orders-row ${
                            expanded ===
                            order._id
                              ? "orders-row--expanded"
                              : ""
                          }`}
                        >
                          {/* ORDER ID */}

                          <td>
                            <span className="orders-mono orders-strong">
                              #
                              {order._id
                                .slice(-6)
                                .toUpperCase()}
                            </span>

                            {shipment.awbCode && (
                              <div className="order-shipped-label">
                                📦 Shipped
                              </div>
                            )}
                          </td>

                          {/* CUSTOMER */}

                          <td>
                            <div className="orders-strong">
                              {order.user
                                ?.name ||
                                "Guest"}
                            </div>

                            <div className="orders-muted orders-small">
                              {order.guestEmail ||
                                order.user
                                  ?.email ||
                                "—"}
                            </div>
                          </td>

                          {/* PHONE */}

                          <td>
                            <span className="orders-mono orders-small">
                              {order.phone ||
                                "—"}
                            </span>
                          </td>

                          {/* TOTAL */}

                          <td>
                            <strong>
                              ₹
                              {
                                order.total
                              }
                            </strong>

                            <div className="orders-muted orders-tiny">
                              {paymentMethodLabel(
                                order.paymentMethod
                              )}
                            </div>
                          </td>

                          {/* PAYMENT */}

                          <td>
                            <span
                              className={`orders-badge ${paymentStatusClass(
                                order.paymentStatus
                              )}`}
                            >
                              {order.paymentStatus ===
                              "awaiting_confirmation"
                                ? "awaiting"
                                : order.paymentStatus}
                            </span>
                          </td>

                          {/* STATUS */}

                          <td>
                            <span className="orders-badge orders-badge--order">
                              {
                                order.orderStatus
                              }
                            </span>
                          </td>

                          {/* UPDATE STATUS */}

                          <td
                            onClick={(
                              event
                            ) =>
                              event.stopPropagation()
                            }
                          >
                            <div className="order-status-control">
                              <select
                                value={
                                  order.orderStatus
                                }
                                disabled={
                                  updatingStatusId ===
                                  order._id
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateStatus(
                                    order._id,

                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="order-status-select"
                              >
                                {STATUS.map(
                                  (
                                    status
                                  ) => (
                                    <option
                                      key={
                                        status
                                      }
                                      value={
                                        status
                                      }
                                    >
                                      {
                                        status
                                      }
                                    </option>
                                  )
                                )}
                              </select>

                              {updatingStatusId ===
                                order._id && (
                                <Loader type="button" />
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED DETAILS */}

                        {expanded ===
                          order._id && (
                          <tr>
                            <td
                              colSpan={
                                7
                              }
                              className="orders-row-details"
                            >
                              <OrderDetails
                                order={
                                  order
                                }
                                isProcessing={
                                  shipping ===
                                  order._id
                                }
                                localFailure={
                                  shippingErrors[
                                    order
                                      ._id
                                  ]
                                }
                                onShip={
                                  shipViaShiprocket
                                }
                                onCopyToken={
                                  copyToken
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  }
                )}

                {orders.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="orders-empty"
                    >
                      No orders yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* =================================
              MOBILE
              ================================= */}

          <div
            className="mobile-only orders-mobile-list"
            aria-label="Orders"
          >
            {orders.map(
              (order) => (
                <MobileOrderCard
                  key={order._id}
                  order={order}
                  expanded={
                    expanded ===
                    order._id
                  }
                  isShipping={
                    shipping ===
                    order._id
                  }
                  localFailure={
                    shippingErrors[
                      order._id
                    ]
                  }
                  onToggle={() =>
                    setExpanded(
                      expanded ===
                        order._id
                        ? null
                        : order._id
                    )
                  }
                  onUpdateStatus={
                    updateStatus
                  }
                  onShip={
                    shipViaShiprocket
                  }
                  onCopyToken={
                    copyToken
                  }
                />
              )
            )}

            {orders.length === 0 && (
              <p className="orders-mobile-empty">
                No orders yet
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}