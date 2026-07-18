// Story: EP0002-ST0001 — Sign Up with Invite Code and Password

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { useAuthStore } from '../src/features/auth/stores/authStore';

// Mock the supabase client — use vi.hoisted to avoid hoisting issues
const { mockFromTable, mockSignUp } = vi.hoisted(() => ({
  mockFromTable: vi.fn(),
  mockSignUp: vi.fn(),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: mockFromTable,
    rpc: vi.fn(),
  },
}));

/**
 * Helper: mock invite_codes table to return a specific result.
 * Passing `null` simulates "code not found".
 */
function mockInviteCodeLookup(result: Record<string, unknown> | null) {
  mockFromTable.mockImplementation((table: string) => {
    if (table === 'invite_codes') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
          })),
        })),
      };
    }
    return {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
      insert: vi.fn(),
      update: vi.fn(() => ({ eq: vi.fn() })),
    };
  });
}

describe('EP0002-ST0001: Sign Up with Invite Code and Password', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().reset();
    window.history.pushState({}, '', '/login');
  });

  describe('@AC-001: Welcome screen shows only invite code field', () => {
    test('test_ac_001_shows_only_invite_code_input_initial', () => {
      render(<App />);

      // The invite code input should be visible
      expect(screen.getByPlaceholderText(/invite code/i)).toBeInTheDocument();

      // Email and password fields should NOT be present initially
      expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/^password$/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/confirm password/i)).not.toBeInTheDocument();
    });
  });

  describe('@AC-002: Valid invite code transitions to sign-up form', () => {
    test('test_ac_002_valid_code_shows_sign_up_form', async () => {
      const user = userEvent.setup();

      // Mock a valid, unused, non-expired invite code
      mockInviteCodeLookup({
        id: 'code-1',
        code: 'VALID-CODE',
        household_id: null,
        used_by: null,
        used_at: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      });

      render(<App />);

      // Enter a valid code
      const input = screen.getByPlaceholderText(/invite code/i);
      await user.type(input, 'VALID-CODE');

      // Click Continue
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Now the sign-up form should appear with email, password, confirm
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
      const passwordFields = screen.getAllByPlaceholderText(/password/i);
      expect(passwordFields.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('@AC-003: Invalid invite code shows error', () => {
    test('test_ac_003_invalid_code_shows_error', async () => {
      const user = userEvent.setup();

      // Mock: code not found in database
      mockInviteCodeLookup(null);

      render(<App />);

      const input = screen.getByPlaceholderText(/invite code/i);
      await user.type(input, 'BAD-CODE');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should see the error message
      expect(
        screen.getByText('Invalid invite code — check with the person who invited you'),
      ).toBeInTheDocument();

      // Should still be on the welcome screen (no sign-up form)
      expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    });
  });

  describe('@AC-004: Expired invite code shows error', () => {
    test('test_ac_004_expired_code_shows_error', async () => {
      const user = userEvent.setup();

      // Mock: code found but expired (yesterday)
      mockInviteCodeLookup({
        id: 'code-2',
        code: 'EXPIRED',
        household_id: null,
        used_by: null,
        used_at: null,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
      });

      render(<App />);

      const input = screen.getByPlaceholderText(/invite code/i);
      await user.type(input, 'EXPIRED');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should see the expired error
      expect(screen.getByText('This invite code has expired')).toBeInTheDocument();

      // Should still be on the welcome screen
      expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    });
  });
});
