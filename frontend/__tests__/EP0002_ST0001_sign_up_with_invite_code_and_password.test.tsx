// Story: EP0002-ST0001 — Sign Up with Invite Code and Password

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

// Mock the supabase client before any imports
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
        maybeSingle: vi.fn(),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
  },
}));

describe('EP0002-ST0001: Sign Up with Invite Code and Password', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
