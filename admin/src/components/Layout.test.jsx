import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";

const renderLayout = () => render(
  <MemoryRouter initialEntries={["/"]}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<p>Dashboard content</p>} />
        <Route path="products" element={<p>Products content</p>} />
        <Route path="events" element={<p>Events content</p>} />
        <Route path="custom-orders" element={<p>Custom orders content</p>} />
        <Route path="login" element={<p>Login content</p>} />
      </Route>
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  window.localStorage.clear();
});

test("opens and closes the mobile More sheet with keyboard support", () => {
  renderLayout();

  fireEvent.click(screen.getByRole("button", { name: /open more navigation/i }));

  expect(screen.getByRole("dialog", { name: "More" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /events & fairs/i })).toHaveAttribute("href", "/events");
  expect(document.activeElement).toHaveAccessibleName(/events & fairs/i);

  fireEvent.keyDown(window, { key: "Escape" });

  expect(screen.queryByRole("dialog", { name: "More" })).not.toBeInTheDocument();
});

test("uses the mobile bottom navigation to change routes", () => {
  renderLayout();
  const mobileNavigation = screen.getByRole("navigation", { name: /primary navigation/i });

  fireEvent.click(within(mobileNavigation).getByRole("link", { name: /products/i }));

  expect(screen.getByText("Products content")).toBeInTheDocument();
  expect(within(mobileNavigation).getByRole("link", { name: /products/i })).toHaveAttribute("aria-current", "page");
});

test("logs out from the mobile More sheet", () => {
  window.localStorage.setItem("admin-token", "test-token");
  renderLayout();

  fireEvent.click(screen.getByRole("button", { name: /open more navigation/i }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "More" })).getByRole("button", { name: /^logout$/i }));

  expect(window.localStorage.getItem("admin-token")).toBeNull();
  expect(screen.getByText("Login content")).toBeInTheDocument();
});
