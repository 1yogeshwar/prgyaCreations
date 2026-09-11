import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Orders from "./Orders";

jest.mock("axios");

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const order = {
  _id: "66f4d1b4ca121e7d6eabcd12",
  user: {
    name: "Asha Sharma",
    email: "asha@example.com",
  },
  phone: "9876543210",
  total: 1299,
  subtotal: 1199,
  shipping: 0,
  tax: 100,
  paymentMethod: "online",
  paymentStatus: "paid",
  orderStatus: "processing",
  trackingToken: "tracking-token-123",
  shippingAddress: {
    firstName: "Asha",
    lastName: "Sharma",
    address: "12 Craft Lane",
    city: "Jaipur",
    state: "Rajasthan",
    zip: "302001",
  },
  items: [
    {
      name: "Handwoven stole",
      quantity: 1,
      price: 1199,
    },
  ],
};

describe("Orders mobile card", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.setItem("admin-token", "test-admin-token");
    axios.get.mockResolvedValue({ data: [order] });
    axios.put.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("expands and updates the order through the existing status endpoint", async () => {
    render(
      <MemoryRouter>
        <Orders />
      </MemoryRouter>
    );

    const statusSelect = await screen.findByLabelText("Update status");
    const mobileOrders = screen.getByLabelText("Orders");
    const mobileCardSummary = mobileOrders.querySelector('[role="button"]');

    expect(statusSelect).toHaveValue("processing");
    expect(mobileCardSummary).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(mobileCardSummary);

    expect(mobileCardSummary).toHaveAttribute("aria-expanded", "true");
    expect(
      mobileOrders.querySelector(`#order-details-${order._id}`)
    ).toHaveTextContent("Handwoven stole");

    fireEvent.change(statusSelect, {
      target: { value: "shipped" },
    });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_URL}/admin/orders/${order._id}`,
        { orderStatus: "shipped" },
        {
          headers: {
            Authorization: "Bearer test-admin-token",
          },
        }
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });
});
