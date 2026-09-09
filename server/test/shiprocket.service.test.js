const assert = require("node:assert/strict");
const test = require("node:test");
const axios = require("axios");

const {
  ShiprocketError,
  createShipmentOrder,
  resetTokenCache,
  selectCourier,
  mapShiprocketStatus,
} = require("../services/shiprocket.service");

const clearCourierPolicy = () => {
  delete process.env.SHIPROCKET_COURIER_MAX_COST;
  delete process.env.SHIPROCKET_COURIER_MIN_RATING;
};

test.afterEach(clearCourierPolicy);

test("selectCourier rejects non-COD courier options and prefers rating before cost", () => {
  const selected = selectCourier([
    { courier_company_id: 11, courier_name: "Not COD", cod: 0, rating: 5, rate: 10 },
    { courier_company_id: 12, courier_name: "Economy", cod: 1, rating: 4.2, rate: 45 },
    { courier_company_id: 13, courier_name: "Reliable", cod: 1, rating: 4.8, rate: 58 },
  ], { cod: true });

  assert.equal(selected.id, 13);
  assert.equal(selected.name, "Reliable");
});

test("selectCourier enforces optional max cost and minimum rating", () => {
  process.env.SHIPROCKET_COURIER_MAX_COST = "50";
  process.env.SHIPROCKET_COURIER_MIN_RATING = "4.5";

  const selected = selectCourier([
    { courier_company_id: 21, courier_name: "Too expensive", cod: 1, rating: 4.9, rate: 80 },
    { courier_company_id: 22, courier_name: "Below rating", cod: 1, rating: 4.2, rate: 30 },
    { courier_company_id: 23, courier_name: "Eligible", cod: 1, rating: 4.7, rate: 45 },
  ], { cod: true });

  assert.equal(selected.id, 23);
});

test("selectCourier does not let missing cost or rating bypass configured limits", () => {
  process.env.SHIPROCKET_COURIER_MAX_COST = "50";
  process.env.SHIPROCKET_COURIER_MIN_RATING = "4.5";

  assert.throws(
    () => selectCourier([
      { courier_company_id: 24, courier_name: "No rating", cod: 1, rate: 40 },
      { courier_company_id: 25, courier_name: "No cost", cod: 1, rating: 4.9 },
    ], { cod: true }),
    (error) => error instanceof ShiprocketError && error.code === "NO_ELIGIBLE_COURIER"
  );
});

test("createShipmentOrder requires an explicitly configured pickup nickname", async () => {
  const originalPost = axios.post;
  const originalEmail = process.env.SHIPROCKET_EMAIL;
  const originalPassword = process.env.SHIPROCKET_PASSWORD;
  const originalPickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  let remoteOrderRequestMade = false;

  process.env.SHIPROCKET_EMAIL = "test@example.com";
  process.env.SHIPROCKET_PASSWORD = "test-password";
  delete process.env.SHIPROCKET_PICKUP_LOCATION;
  resetTokenCache();
  axios.post = async (url) => {
    if (url.endsWith("/auth/login")) return { data: { token: "test-token" } };
    remoteOrderRequestMade = true;
    throw new Error("The create-order request must not be sent without a pickup nickname");
  };

  try {
    await assert.rejects(
      () => createShipmentOrder({
        order: {
          createdAt: new Date(), total: 100, paymentMethod: "online",
          shippingAddress: { firstName: "Test", address: "Street", city: "City", state: "State", zip: "400001" },
        },
        parcel: { lengthCm: 10, breadthCm: 10, heightCm: 10, weightKg: 0.5 },
        orderItems: [{ name: "Test item", sku: "TEST-1", units: 1, selling_price: 100 }],
        externalOrderId: "PC-test",
        phone: "9876543210",
        email: "test@example.com",
      }),
      (error) => error instanceof ShiprocketError &&
        error.code === "SHIPROCKET_PICKUP_LOCATION_MISSING" &&
        error.stage === "create_order"
    );
    assert.equal(remoteOrderRequestMade, false);
  } finally {
    axios.post = originalPost;
    if (originalEmail === undefined) delete process.env.SHIPROCKET_EMAIL;
    else process.env.SHIPROCKET_EMAIL = originalEmail;
    if (originalPassword === undefined) delete process.env.SHIPROCKET_PASSWORD;
    else process.env.SHIPROCKET_PASSWORD = originalPassword;
    if (originalPickupLocation === undefined) delete process.env.SHIPROCKET_PICKUP_LOCATION;
    else process.env.SHIPROCKET_PICKUP_LOCATION = originalPickupLocation;
    resetTokenCache();
  }
});

test("selectCourier signals an actionable failure when no courier qualifies", () => {
  assert.throws(
    () => selectCourier([{ courier_company_id: 31, courier_name: "No COD", cod: false, rate: 30 }], { cod: true }),
    (error) => error instanceof ShiprocketError && error.code === "NO_ELIGIBLE_COURIER"
  );
});

test("mapShiprocketStatus exposes customer-friendly normalized shipping states", () => {
  assert.equal(mapShiprocketStatus("Out For Delivery"), "OUT_FOR_DELIVERY");
  assert.equal(mapShiprocketStatus("Shipment picked up"), "PICKED_UP");
  assert.equal(mapShiprocketStatus("Pickup Generated"), "PICKUP_SCHEDULED");
  assert.equal(mapShiprocketStatus("Shipped"), "IN_TRANSIT");
  assert.equal(mapShiprocketStatus("In Transit"), "IN_TRANSIT");
  assert.equal(mapShiprocketStatus("Delivered"), "DELIVERED");
  assert.equal(mapShiprocketStatus("RTO Delivered"), "RTO");
});
