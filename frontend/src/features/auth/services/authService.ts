import { supabase } from '@/lib/supabase';

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
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      error: 'Invalid invite code — check with the person who invited you',
    };
  }

  const record = data as InviteCodeRecord;

  // Check if expired
  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return {
      valid: false,
      error: 'This invite code has expired',
    };
  }

  // Check if already used
  if (record.used_by || record.used_at) {
    return {
      valid: false,
      error: 'This invite code has already been used',
    };
  }

  return { valid: true, record };
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

  // 2. Create personal household
  const { data: householdData, error: householdError } = await supabase
    .from('households')
    .insert({
      name: 'My Home',
      created_by: authData.user.id,
    })
    .select()
    .single();

  if (householdError || !householdData) {
    return { success: false, error: 'Failed to create household. Please try again.' };
  }

  // 3. Add user as admin member of personal household
  const { error: membershipError } = await supabase.from('household_memberships').insert({
    household_id: householdData.id,
    profile_id: authData.user.id,
    role: 'admin',
  });

  if (membershipError) {
    return { success: false, error: 'Failed to set up household membership.' };
  }

  // 4. Look up the invite code record to get household_id
  const { data: inviteData } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', inviteCode.toUpperCase().trim())
    .maybeSingle();

  const inviteRecord = inviteData as InviteCodeRecord | null;

  // 5. Mark invite code as used
  await supabase
    .from('invite_codes')
    .update({
      used_by: authData.user.id,
      used_at: new Date().toISOString(),
    })
    .eq('code', inviteCode.toUpperCase().trim());

  // 6. If invite code is linked to a shared household, add user as member
  if (inviteRecord?.household_id) {
    await supabase.from('household_memberships').insert({
      household_id: inviteRecord.household_id,
      profile_id: authData.user.id,
      role: 'member',
    });
  }

  return { success: true };
}
