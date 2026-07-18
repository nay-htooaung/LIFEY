import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

export interface InviteCodeRecord {
  id: string;
  code: string;
  household_id: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_by: string | null;
}

export interface InviteCodeValidation {
  valid: boolean;
  error?: string;
  record?: InviteCodeRecord;
}

/**
 * Validates an invite code by querying the invite_codes table.
 * Returns { valid: true, record } if the code exists, is not expired,
 * and has not been used. Otherwise returns { valid: false, error }.
 */
export async function validateInviteCode(code: string): Promise<InviteCodeValidation> {
  const { data, error } = (await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle()) as { data: InviteCodeRecord | null; error: PostgrestError | null };

  if (error || !data) {
    return {
      valid: false,
      error: 'Invalid invite code — check with the person who invited you',
    };
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return {
      valid: false,
      error: 'This invite code has expired',
    };
  }

  // Check if already used
  if (data.used_by || data.used_at) {
    return {
      valid: false,
      error: 'This invite code has already been used',
    };
  }

  return { valid: true, record: data };
}

export interface SignUpResult {
  success: boolean;
  error?: string;
}

/**
 * Creates an account with email + password, creates a personal household,
 * and marks the invite code as used. Returns the result.
 */
export async function signUpWithInviteCode(
  email: string,
  password: string,
  inviteCode: string,
): Promise<SignUpResult> {
  // 1. Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { invite_code: inviteCode },
    },
  });

  if (authError) {
    // Handle specific error cases
    if (authError.message?.includes('already registered')) {
      return {
        success: false,
        error: 'An account with this email already exists — please log in instead',
      };
    }
    return { success: false, error: authError.message };
  }

  if (!authData.user) {
    return { success: false, error: 'Failed to create account. Please try again.' };
  }

  // Everything else (profile, personal household, invite code consumption,
  // shared household joining) is handled by the handle_new_user() database
  // trigger on auth.users insert.
  return { success: true };
}
