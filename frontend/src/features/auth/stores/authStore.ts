import { create } from 'zustand';

export type AuthPhase = 'welcome' | 'sign_up' | 'account_created';

interface AuthState {
  phase: AuthPhase;
  inviteCode: string;
  error: string | null;
  loading: boolean;
  validatedCode: string | null;

  setPhase: (phase: AuthPhase) => void;
  setInviteCode: (code: string) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  acceptInviteCode: (code: string) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  phase: 'welcome',
  inviteCode: '',
  error: null,
  loading: false,
  validatedCode: null,

  setPhase: (phase) => set({ phase, error: null }),
  setInviteCode: (inviteCode) => set({ inviteCode }),
  setError: (error) => set({ error }),
  setLoading: (loading) => set({ loading }),
  acceptInviteCode: (code) =>
    set({ phase: 'sign_up', validatedCode: code, inviteCode: code, error: null }),
  reset: () =>
    set({
      phase: 'welcome',
      inviteCode: '',
      error: null,
      loading: false,
      validatedCode: null,
    }),
}));
