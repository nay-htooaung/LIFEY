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

  describe("@AC-003: Offline indicator", () => {
    beforeEach(() => {
      // Ensure we start in online state
      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });
    });

    it("shows an offline indicator when the browser goes offline", () => {
      render(<App />);

      // Initially no offline indicator
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();

      // Simulate going offline
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });

      // The offline indicator should now be visible
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    it("hides the offline indicator when coming back online", () => {
      render(<App />);

      // Go offline
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event("offline"));
      });

      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();

      // Come back online
      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
    });
  });

  describe("@AC-002: Standalone mode and main app screen", () => {
    it("shows the main app screen with tagline at the root route", () => {
      window.history.pushState({}, "", "/");
      render(<App />);

      // The main app screen should display the tagline (unique to HomePage)
      expect(
        screen.getByText("Your life together, simplified."),
      ).toBeInTheDocument();
    });

    it("has an app shell with a header containing the app name", () => {
      render(<App />);

      // The app shell layout should include a header with the app name
      const headers = screen.getAllByRole("heading", { name: /lifey/i });
      expect(headers.length).toBeGreaterThan(0);
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
