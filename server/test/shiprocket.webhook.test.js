const assert = require("node:assert/strict");
const test = require("node:test");
const axios = require("axios");

const Order = require("../models/order.model");
const {
  parseShiprocketWebhookDate,
  parseShiprocketTrackingEvent,
  shiprocketWebhook,
} = require("../controllers/shiprocket.controller");

const originalFindOne = Order.findOne;
const originalFindOneAndUpdate = Order.findOneAndUpdate;
const originalWebhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;

const setPath = (target, path, value) => {
  const parts = path.split(".");
  const last = parts.pop();
  const parent = parts.reduce((current, part) => {
    if (!current[part]) current[part] = {};
    return current[part];
  }, target);
  parent[last] = value;
};

const makeOrder = (overrides = {}) => {
  const { shiprocket: shiprocketOverrides = {}, ...orderOverrides } = overrides;
  return {
    _id: "507f1f77bcf86cd799439011",
    orderStatus: "processing",
    shiprocket: {
      awbCode: "19041424751540",
      externalOrderId: "1373900_150876814",
      orderId: "348456385",
      courierName: "",
      status: "AWB_ASSIGNED",
      automationState: "COMPLETED",
      pickup: { requestState: "REQUESTED", status: "REQUESTED" },
      lastProviderEventAt: null,
      lastProviderEventKey: "",
      ...shiprocketOverrides,
    },
    ...orderOverrides,
  };
};

const sampleWebhookPayload = (overrides = {}) => ({
  awb: "19041424751540",
  courier_name: "Delhivery Surface",
  current_status: "IN TRANSIT",
  current_status_id: 20,
  shipment_status: "IN TRANSIT",
  shipment_status_id: 18,
  current_timestamp: "23 05 2023 11:43:52",
  order_id: "1373900_150876814",
  sr_order_id: 348456385,
  scans: [
    {
      date: "2023-05-19 11:59:16",
      "sr-status-label": "MANIFEST GENERATED",
    },
    {
      date: "2023-05-20 12:00:00",
      "sr-status-label": "PICKED UP",
    },
  ],
  ...overrides,
});

const makeRequest = (body, token = "test-webhook-token") => ({
  body,
  headers: token === null ? {} : { "x-api-key": token },
  get(name) {
    return String(name).toLowerCase() === "x-api-key" ? this.headers["x-api-key"] : undefined;
  },
});

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const installOrderMock = (order) => {
  const calls = { findOne: 0, findOneAndUpdate: 0, lastUpdateFilter: null };

  Order.findOne = async (query) => {
    calls.findOne += 1;
    return query?.["shiprocket.awbCode"] === order.shiprocket.awbCode ? order : null;
  };
  Order.findOneAndUpdate = async (filter, update) => {
    calls.findOneAndUpdate += 1;
    calls.lastUpdateFilter = filter;
    const incomingAt = new Date(update.$set["shiprocket.lastProviderEventAt"]);
    const existingAt = order.shiprocket.lastProviderEventAt
      ? new Date(order.shiprocket.lastProviderEventAt)
      : null;
    if (existingAt && incomingAt.getTime() <= existingAt.getTime()) return null;

    for (const [path, value] of Object.entries(update.$set)) setPath(order, path, value);
    return order;
  };

  return calls;
};

test.beforeEach(() => {
  process.env.SHIPROCKET_WEBHOOK_TOKEN = "test-webhook-token";
  Order.findOne = originalFindOne;
  Order.findOneAndUpdate = originalFindOneAndUpdate;
});

test.after(() => {
  Order.findOne = originalFindOne;
  Order.findOneAndUpdate = originalFindOneAndUpdate;
  if (originalWebhookToken === undefined) delete process.env.SHIPROCKET_WEBHOOK_TOKEN;
  else process.env.SHIPROCKET_WEBHOOK_TOKEN = originalWebhookToken;
});

test("parses documented Shiprocket callback timestamps as India time", () => {
  assert.equal(
    parseShiprocketWebhookDate("23 05 2023 11:43:52").toISOString(),
    "2023-05-23T06:13:52.000Z"
  );
  assert.equal(
    parseShiprocketWebhookDate("2023-05-23 11:43:52").toISOString(),
    "2023-05-23T06:13:52.000Z"
  );
  assert.equal(parseShiprocketWebhookDate("31 02 2023 11:43:52"), null);
  assert.equal(parseShiprocketWebhookDate("2023-13-23 11:43:52"), null);
});

test("normalizes a dated legacy tracking response into the same guarded event shape", () => {
  const event = parseShiprocketTrackingEvent({
    tracking_data: {
      shipment_track: [{
        current_status: "SHIPPED",
        current_status_id: 20,
        shipment_status: "SHIPPED",
        shipment_status_id: 18,
      }],
      shipment_track_activities: [{
        date: "2023-05-23 11:43:52",
        activity: "SHIPPED",
      }],
    },
  }, "19041424751540");

  assert.equal(event.awb, "19041424751540");
  assert.equal(event.friendlyStatus, "IN_TRANSIT");
  assert.equal(event.occurredAt.toISOString(), "2023-05-23T06:13:52.000Z");
});

test("rejects missing or invalid webhook x-api-key before any database access", async () => {
  let findOneCalled = false;
  Order.findOne = async () => {
    findOneCalled = true;
    return null;
  };

  const missingTokenResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload(), null), missingTokenResponse);
  assert.equal(missingTokenResponse.statusCode, 401);
  assert.equal(missingTokenResponse.body.message, "Unauthorized webhook");

  const invalidTokenResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload(), "wrong-token"), invalidTokenResponse);
  assert.equal(invalidTokenResponse.statusCode, 401);
  assert.equal(invalidTokenResponse.body.message, "Unauthorized webhook");
  assert.equal(findOneCalled, false);
});

test("fails closed when the server-only webhook token is not configured", async () => {
  delete process.env.SHIPROCKET_WEBHOOK_TOKEN;
  const response = makeResponse();

  await shiprocketWebhook(makeRequest(sampleWebhookPayload()), response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.message, "Shiprocket webhook is not configured");
});

test("persists an authenticated tracking callback without making a Shiprocket request", async () => {
  const order = makeOrder();
  const calls = installOrderMock(order);
  const originalGet = axios.get;
  const originalPost = axios.post;
  axios.get = async () => {
    throw new Error("Webhook handling must not call Shiprocket");
  };
  axios.post = async () => {
    throw new Error("Webhook handling must not call Shiprocket");
  };

  try {
    const response = makeResponse();
    await shiprocketWebhook(makeRequest(sampleWebhookPayload()), response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { received: true, outcome: "updated" });
    assert.equal(calls.findOne, 1);
    assert.equal(calls.findOneAndUpdate, 1);
    assert.equal(calls.lastUpdateFilter["shiprocket.awbCode"], "19041424751540");
    assert.equal(order.shiprocket.status, "IN_TRANSIT");
    assert.equal(order.shiprocket.courierName, "Delhivery Surface");
    assert.equal(order.shiprocket.pickup.status, "PICKED_UP");
    assert.equal(order.orderStatus, "shipped");
    assert.equal(order.shiprocket.lastProviderStatus, "IN TRANSIT");
    assert.equal(order.shiprocket.lastProviderEventAt.toISOString(), "2023-05-23T06:13:52.000Z");
  } finally {
    axios.get = originalGet;
    axios.post = originalPost;
  }
});

test("acknowledges duplicate and delayed callbacks without overwriting the newest state", async () => {
  const order = makeOrder();
  const calls = installOrderMock(order);

  const firstResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload()), firstResponse);
  assert.equal(firstResponse.body.outcome, "updated");

  const duplicateResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload()), duplicateResponse);
  assert.deepEqual(duplicateResponse.body, { received: true, outcome: "duplicate" });

  const staleResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload({
    current_status: "PICKED UP",
    current_status_id: 6,
    shipment_status: "PICKED UP",
    shipment_status_id: 6,
    current_timestamp: "23 05 2023 10:43:52",
  })), staleResponse);
  assert.deepEqual(staleResponse.body, { received: true, outcome: "stale" });
  assert.equal(calls.findOneAndUpdate, 1);
  assert.equal(order.shiprocket.status, "IN_TRANSIT");
  assert.equal(order.orderStatus, "shipped");
});

test("acknowledges unknown or mismatched shipments without creating or mutating an order", async () => {
  const order = makeOrder();
  const calls = installOrderMock(order);

  const unknownResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload({ awb: "unknown-awb" })), unknownResponse);
  assert.deepEqual(unknownResponse.body, { received: true, outcome: "ignored" });

  const mismatchedResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload({ order_id: "different-merchant-order" })), mismatchedResponse);
  assert.deepEqual(mismatchedResponse.body, { received: true, outcome: "ignored" });
  assert.equal(calls.findOneAndUpdate, 0);
  assert.equal(order.shiprocket.status, "AWB_ASSIGNED");
});

test("updates delivery while preserving an RTO order instead of cancelling it", async () => {
  const rtoOrder = makeOrder({ orderStatus: "shipped" });
  installOrderMock(rtoOrder);
  const rtoResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload({
    current_status: "RTO In Transit",
    current_status_id: 26,
    shipment_status: "RTO In Transit",
    shipment_status_id: 26,
  })), rtoResponse);
  assert.equal(rtoResponse.body.outcome, "updated");
  assert.equal(rtoOrder.shiprocket.status, "RTO");
  assert.equal(rtoOrder.orderStatus, "shipped");

  const deliveredOrder = makeOrder({ orderStatus: "shipped" });
  installOrderMock(deliveredOrder);
  const deliveredResponse = makeResponse();
  await shiprocketWebhook(makeRequest(sampleWebhookPayload({
    current_status: "Delivered",
    current_status_id: 7,
    shipment_status: "Delivered",
    shipment_status_id: 7,
  })), deliveredResponse);
  assert.equal(deliveredResponse.body.outcome, "updated");
  assert.equal(deliveredOrder.shiprocket.status, "DELIVERED");
  assert.equal(deliveredOrder.orderStatus, "delivered");
});
