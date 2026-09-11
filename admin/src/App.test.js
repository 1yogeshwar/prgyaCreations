import { render, screen } from "@testing-library/react";
import App from "./App";

test("routes unauthenticated visitors to the admin login", () => {
  window.localStorage.clear();

  render(<App />);

  expect(screen.getByRole("heading", { name: /admin login/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^login$/i })).toBeInTheDocument();
});
