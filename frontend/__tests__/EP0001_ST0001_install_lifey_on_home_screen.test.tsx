// Story: EP0001-ST0001 — Install LIFEY on Home Screen (PWA)

import fs from 'fs';
import path from 'path';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

/**
 * Helper to create a mock BeforeInstallPromptEvent.
 * The `beforeinstallprompt` event is a non-standard Chrome/Edge/Safari event
 * with `prompt()` and `userChoice` properties.
 */
function createMockBeforeInstallPromptEvent() {
  const event = new Event('beforeinstallprompt');
  const mockPrompt = vi.fn();
  const mockUserChoice = Promise.resolve({ outcome: 'accepted' as const });

  Object.defineProperty(event, 'prompt', {
    value: mockPrompt,
    writable: true,
  });
  Object.defineProperty(event, 'userChoice', {
    value: mockUserChoice,
    writable: true,
  });

  return { event, mockPrompt, mockUserChoice };
}

describe('EP0001-ST0001: Install LIFEY on Home Screen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('@AC-001: Install prompt on supported browsers', () => {
    test('test_ac_001_shows_install_prompt_on_supported_browser', () => {
      const { event } = createMockBeforeInstallPromptEvent();

      render(<App />);

      // Before the event, no install prompt should be shown
      expect(screen.queryByRole('button', { name: /install/i })).not.toBeInTheDocument();

      // Fire the beforeinstallprompt event (simulates supported browser)
      act(() => {
        window.dispatchEvent(event);
      });

      // The install prompt button should now be visible
      expect(screen.getByRole('button', { name: /install lifey/i })).toBeInTheDocument();
    });

    test('test_ac_001_calls_prompt_when_install_button_clicked', async () => {
      const user = userEvent.setup();
      const { event, mockPrompt } = createMockBeforeInstallPromptEvent();

      render(<App />);
      act(() => {
        window.dispatchEvent(event);
      });

      const installButton = screen.getByRole('button', {
        name: /install lifey/i,
      });
      await user.click(installButton);

      expect(mockPrompt).toHaveBeenCalledTimes(1);
    });
  });

  describe('@AC-002: Standalone mode and main app screen', () => {
    test('test_ac_002_shows_main_app_screen_with_tagline', () => {
      window.history.pushState({}, '', '/');
      render(<App />);

      // The main app screen should display the tagline (unique to HomePage)
      expect(screen.getByText('Your life together, simplified.')).toBeInTheDocument();
    });

    test('test_ac_002_has_app_shell_with_header', () => {
      render(<App />);

      // The app shell layout should include a header with the app name
      const headers = screen.getAllByRole('heading', { name: /lifey/i });
      expect(headers.length).toBeGreaterThan(0);
    });
  });

  describe('@AC-003: Offline indicator', () => {
    beforeEach(() => {
      // Ensure we start in online state
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
    });

    test('test_ac_003_shows_offline_indicator_when_offline', () => {
      render(<App />);

      // Initially no offline indicator
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // The offline indicator should now be visible
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    test('test_ac_003_hides_offline_indicator_when_back_online', () => {
      render(<App />);

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
    });
  });

  describe('@AC-004: Unsupported browser — no install prompt', () => {
    test('test_ac_004_no_install_prompt_on_unsupported_browser', () => {
      render(<App />);

      // No install prompt should be shown (beforeinstallprompt never fires)
      expect(screen.queryByRole('button', { name: /install lifey/i })).not.toBeInTheDocument();
    });

    test('test_ac_004_app_renders_on_unsupported_browser', () => {
      render(<App />);

      // The app shell still renders normally
      expect(screen.getByText('Your life together, simplified.')).toBeInTheDocument();
    });
  });

  describe('@AC-005: Service worker update', () => {
    test('test_ac_005_configures_vite_plugin_pwa_auto_update', () => {
      // Read the vite config file to verify autoUpdate setting.
      // registerType: "autoUpdate" makes the service worker call
      // skipWaiting() and clientsClaim(), so updates apply immediately
      // in the background and take effect on next visit.
      const configContent = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');

      expect(configContent).toContain('registerType: "autoUpdate"');
    });
  });
});
