import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../src/App";

describe("App", () => {
  it("renders the login page placeholder", () => {
    render(<App />);
    expect(screen.getByText("Login Page Placeholder")).toBeInTheDocument();
  });
});
