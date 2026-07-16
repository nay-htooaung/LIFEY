// Story: EP0001-ST0001 — Install LIFEY on Home Screen (PWA)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";

/**
 * Helper to create a mock BeforeInstallPromptEvent.
 * The `beforeinstallprompt` event is a non-standard Chrome/Edge/Safari event
 * with `prompt()` and `userChoice` properties.
 */
function createMockBeforeInstallPromptEvent() {
  const event = new Event("beforeinstallprompt");
  const mockPrompt = vi.fn();
  const mockUserChoice = Promise.resolve({ outcome: "accepted" as const });

  Object.defineProperty(event, "prompt", {
    value: mockPrompt,
    writable: true,
  });
  Object.defineProperty(event, "userChoice", {
    value: mockUserChoice,
    writable: true,
  });

  return { event, mockPrompt, mockUserChoice };
}

describe("EP0001-ST0001: Install LIFEY on Home Screen", () => {
  beforeEach(() => {
    // Ensure we start with a clean window event listeners
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("@AC-002: Standalone mode and main app screen", () => {
    it("shows the main app screen at the root route", () => {
      window.history.pushState({}, "", "/");
      render(<App />);

      // The main app screen should be displayed
      expect(screen.getByText(/lifey/i)).toBeInTheDocument();
    });

    it("detects standalone display mode", () => {
      render(<App />);

      // The app shell layout should include a header with the app name
      expect(screen.getByRole("heading", { name: /lifey/i })).toBeInTheDocument();
    });
  });

  describe("@AC-001: Install prompt on supported browsers", () => {
    it("shows an install prompt when beforeinstallprompt event fires", () => {
      const { event } = createMockBeforeInstallPromptEvent();

      render(<App />);

      // Before the event, no install prompt should be shown
      expect(
        screen.queryByRole("button", { name: /install/i }),
      ).not.toBeInTheDocument();

      // Fire the beforeinstallprompt event (simulates supported browser)
      act(() => {
        window.dispatchEvent(event);
      });

      // The install prompt button should now be visible
      expect(
        screen.getByRole("button", { name: /install lifey/i }),
      ).toBeInTheDocument();
    });

    it("calls prompt() when the install button is clicked", async () => {
      const user = userEvent.setup();
      const { event, mockPrompt } = createMockBeforeInstallPromptEvent();

      render(<App />);
      act(() => {
        window.dispatchEvent(event);
      });

      const installButton = screen.getByRole("button", {
        name: /install lifey/i,
      });
      await user.click(installButton);

      expect(mockPrompt).toHaveBeenCalledTimes(1);
    });
  });
});
