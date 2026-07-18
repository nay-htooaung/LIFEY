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

// Track calls for assertions
let householdMembershipInserts: Array<Record<string, unknown>> = [];
let householdInserts: Array<Record<string, unknown>> = [];
let inviteCodeUpdates: Array<Record<string, unknown>> = [];

/**
 * Helper: mock invite_codes table to return a specific result.
 * Passing `null` simulates "code not found".
 */
function mockInviteCodeLookup(result: Record<string, unknown> | null) {
  householdMembershipInserts = [];
  householdInserts = [];
  inviteCodeUpdates = [];

  mockFromTable.mockImplementation((table: string) => {
    if (table === 'invite_codes') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: result, error: null }),
          })),
        })),
        update: vi.fn((data: Record<string, unknown>) => {
          inviteCodeUpdates.push(data);
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
      };
    }
    if (table === 'households') {
      return {
        insert: vi.fn((data: Record<string, unknown>) => {
          householdInserts.push(data);
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'household-1', name: 'My Home', created_by: 'new-user' },
                error: null,
              }),
            })),
          };
        }),
      };
    }
    if (table === 'household_memberships') {
      return {
        insert: vi.fn((data: Record<string, unknown>) => {
          householdMembershipInserts.push(data);
          return { error: null };
        }),
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

  describe('@AC-005: Used invite code shows error', () => {
    test('test_ac_005_used_code_shows_error', async () => {
      const user = userEvent.setup();

      // Mock: code found but already used
      mockInviteCodeLookup({
        id: 'code-3',
        code: 'USED-CODE',
        household_id: null,
        used_by: 'some-user-id',
        used_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(), // not expired
      });

      render(<App />);

      const input = screen.getByPlaceholderText(/invite code/i);
      await user.type(input, 'USED-CODE');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should see the used error
      expect(
        screen.getByText('This invite code has already been used'),
      ).toBeInTheDocument();

      // Should still be on the welcome screen
      expect(screen.queryByPlaceholderText(/email/i)).not.toBeInTheDocument();
    });
  });

  describe('@AC-007: Password too short shows error', () => {
    test('test_ac_007_password_too_short_shows_error', async () => {
      const user = userEvent.setup();

      // Mock a valid invite code
      mockInviteCodeLookup({
        id: 'code-5',
        code: 'SHORT',
        household_id: null,
        used_by: null,
        used_at: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      render(<App />);

      // Enter valid invite code
      await user.type(screen.getByPlaceholderText(/invite code/i), 'SHORT');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Fill in form with short password
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/^password$/i), '1234567'); // 7 chars
      await user.type(screen.getByPlaceholderText(/confirm password/i), '1234567');

      // Click Create Account
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should see the password too short error
      expect(
        screen.getByText('Password must be at least 8 characters'),
      ).toBeInTheDocument();

      // Should NOT have called signUp
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('@AC-008: Passwords do not match shows error', () => {
    test('test_ac_008_passwords_mismatch_shows_error', async () => {
      const user = userEvent.setup();

      // Mock a valid invite code
      mockInviteCodeLookup({
        id: 'code-6',
        code: 'MISMATCH',
        household_id: null,
        used_by: null,
        used_at: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      render(<App />);

      // Enter valid invite code
      await user.type(screen.getByPlaceholderText(/invite code/i), 'MISMATCH');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Fill in form with mismatching passwords
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/^password$/i), 'password123');
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password456');

      // Click Create Account
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should see the mismatch error
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

      // Should NOT have called signUp
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('@AC-009: Email already registered shows error', () => {
    test('test_ac_009_email_already_registered_shows_error', async () => {
      const user = userEvent.setup();

      // Mock a valid invite code
      mockInviteCodeLookup({
        id: 'code-7',
        code: 'EXISTS',
        household_id: null,
        used_by: null,
        used_at: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      // Mock Supabase signUp to return "already registered" error
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('User already registered'),
      });

      render(<App />);

      // Enter valid invite code
      await user.type(screen.getByPlaceholderText(/invite code/i), 'EXISTS');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Fill in form
      await user.type(screen.getByPlaceholderText(/email/i), 'exists@example.com');
      await user.type(screen.getByPlaceholderText(/^password$/i), 'password123');
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123');

      // Click Create Account
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should see the email exists error
      expect(
        screen.getByText(
          'An account with this email already exists — please log in instead',
        ),
      ).toBeInTheDocument();

      // Should still be on the sign-up form (not redirected)
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    });
  });

  describe('@AC-006: Valid sign-up creates account and authenticates', () => {
    test('test_ac_006_valid_sign_up_creates_account', async () => {
      const user = userEvent.setup();

      // Mock a valid invite code
      mockInviteCodeLookup({
        id: 'code-4',
        code: 'SIGNUP',
        household_id: null,
        used_by: null,
        used_at: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      // Mock successful sign-up
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user' }, session: { access_token: 'test-token' } },
        error: null,
      });

      render(<App />);

      // Enter valid invite code
      const codeInput = screen.getByPlaceholderText(/invite code/i);
      await user.type(codeInput, 'SIGNUP');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should now see the sign-up form
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();

      // Fill in sign-up form
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com');
      await user.type(screen.getByPlaceholderText(/^password$/i), 'password123');
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123');

      // Click Create Account
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should see the account created screen
      expect(screen.getByText('Account created!')).toBeInTheDocument();

      // Verify supabase.auth.signUp was called with correct args
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: { data: { invite_code: 'SIGNUP' } },
      });
    });
  });

  describe('@AC-010: Account creation completes with household and code marked used', () => {
    test('test_ac_010_completes_household_and_marks_code_used', async () => {
      const user = userEvent.setup();

      // Mock a valid invite code
      mockInviteCodeLookup({
        id: 'code-8',
        code: 'COMPLETE',
        household_id: null,
        used_by: null,
        used_at: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user' }, session: { access_token: 'test-token' } },
        error: null,
      });

      render(<App />);

      // Complete sign-up flow
      await user.type(screen.getByPlaceholderText(/invite code/i), 'COMPLETE');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.type(screen.getByPlaceholderText(/email/i), 'complete@example.com');
      await user.type(screen.getByPlaceholderText(/^password$/i), 'password123');
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Personal household was created
      expect(householdInserts.length).toBeGreaterThanOrEqual(1);

      // Invite code was marked as used
      expect(inviteCodeUpdates.length).toBeGreaterThanOrEqual(1);
      expect(inviteCodeUpdates[0]).toHaveProperty('used_by', 'new-user');

      // User was added as admin to their personal household
      expect(householdMembershipInserts.length).toBeGreaterThanOrEqual(1);
      expect(householdMembershipInserts[0]).toMatchObject({
        role: 'admin',
        profile_id: 'new-user',
      });
    });
  });

  describe('@AC-011: Invite code linked to shared household adds user as member', () => {
    test('test_ac_011_linked_code_adds_to_shared_household', async () => {
      const user = userEvent.setup();

      // Mock an invite code linked to a shared household
      mockInviteCodeLookup({
        id: 'code-9',
        code: 'SHARED',
        household_id: 'shared-household-1',
        used_by: null,
        used_at: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      mockSignUp.mockResolvedValue({
        data: { user: { id: 'shared-user' }, session: { access_token: 'test-token' } },
        error: null,
      });

      render(<App />);

      // Complete sign-up flow
      await user.type(screen.getByPlaceholderText(/invite code/i), 'SHARED');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.type(screen.getByPlaceholderText(/email/i), 'shared@example.com');
      await user.type(screen.getByPlaceholderText(/^password$/i), 'password123');
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should see account created
      expect(screen.getByText('Account created!')).toBeInTheDocument();

      // Should have a membership for the shared household
      const sharedMembership = householdMembershipInserts.find(
        (m) => m.household_id === 'shared-household-1',
      );
      expect(sharedMembership).toBeTruthy();
      expect(sharedMembership).toMatchObject({
        role: 'member',
        profile_id: 'shared-user',
      });
    });
  });
});
