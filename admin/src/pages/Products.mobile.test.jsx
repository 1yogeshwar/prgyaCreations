import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Products from "./Products";

jest.mock("axios");

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const product = {
  _id: "product-123",
  name: "Resin Daisy Keyring",
  slug: "resin-daisy-keyring",
  description: "A handmade resin keyring.",
  price: 299,
  originalPrice: 399,
  category: "Keyring",
  subcategory: "Resin Keyring",
  stock: 10,
  images: [],
  shipping: {
    sku: "PC-KEY-001",
    weightKg: 0.1,
    lengthCm: 5,
    breadthCm: 5,
    heightCm: 1,
  },
  isFeatured: true,
  isBestseller: true,
  isNew: false,
  isOnSale: true,
};

const originalScrollTo = window.scrollTo;
let confirmSpy;

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.setItem("admin-token", "test-admin-token");
  window.scrollTo = jest.fn();
  confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

  axios.get.mockResolvedValue({ data: [product] });
  axios.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  confirmSpy.mockRestore();
  window.scrollTo = originalScrollTo;
  window.localStorage.clear();
});

test("mobile product card exposes details and reuses edit and delete handlers", async () => {
  render(
    <MemoryRouter initialEntries={["/products"]}>
      <Products />
    </MemoryRouter>
  );

  const mobileList = await waitFor(() => {
    const list = document.querySelector(".products-mobile-list");
    expect(list).toBeInTheDocument();
    expect(within(list).getByText(product.name)).toBeInTheDocument();
    return list;
  });
  const card = mobileList.querySelector(".product-card");

  expect(card).toBeInTheDocument();
  expect(within(card).getByText(product.slug)).toBeInTheDocument();
  expect(within(card).getByText("₹299")).toBeInTheDocument();
  expect(within(card).getByText("₹399")).toBeInTheDocument();
  expect(within(card).getByText("10 left")).toBeInTheDocument();
  expect(within(card).getByText("Keyring")).toBeInTheDocument();
  expect(within(card).getByText("Resin Keyring")).toBeInTheDocument();
  expect(within(card).getByLabelText("Featured")).toBeInTheDocument();
  expect(within(card).getByLabelText("Bestseller")).toBeInTheDocument();
  expect(within(card).getByLabelText("On sale")).toBeInTheDocument();

  await userEvent.click(within(card).getByRole("button", { name: "Edit" }));

  expect(await screen.findByRole("button", { name: "Update Product" })).toBeInTheDocument();
  expect(screen.getByDisplayValue(product.name)).toBeInTheDocument();
  expect(screen.getByDisplayValue(product.slug)).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

  await userEvent.click(within(card).getByRole("button", { name: "Delete" }));

  expect(confirmSpy).toHaveBeenCalledWith("Delete this product?");
  await waitFor(() => {
    expect(axios.delete).toHaveBeenCalledWith(
      `${process.env.REACT_APP_API_URL}/admin/products/${product._id}`,
      {
        headers: {
          Authorization: "Bearer test-admin-token",
        },
      }
    );
  });
});
