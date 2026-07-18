import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { validateInviteCode } from '@/features/auth/services/authService';

export function WelcomePage() {
  const [code, setCode] = useState('');
  const { error, loading, acceptInviteCode, setError, setLoading } = useAuthStore();

  const handleContinue = async () => {
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await validateInviteCode(code.trim());
      if (result.valid) {
        acceptInviteCode(code.trim());
      } else {
        setError(result.error || 'Invalid invite code');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D1F] px-6 text-neutral-50">
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Logo + Title */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500">
          <span className="text-2xl font-bold text-white">L</span>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-purple-300">LIFEY</h1>
      </div>

      {/* Spacer */}
      <div className="h-10" />

      {/* Join section */}
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-[28px] font-bold text-white">Join LIFEY</h2>
        <p className="text-center text-base leading-relaxed text-neutral-400">
          Enter your invite code to
          <br />
          create an account
        </p>
      </div>

      {/* Spacer */}
      <div className="h-8" />

      {/* Invite code input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white" htmlFor="invite-code">
          Invite Code
        </label>
        <input
          id="invite-code"
          type="text"
          placeholder="Invite Code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          className="h-12 w-full rounded-[10px] border border-[#2D2D45] bg-[#1C1C30] px-4 text-white placeholder-neutral-500 outline-none transition-colors focus:border-purple-500"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-3 text-sm leading-relaxed text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* Continue button */}
      <button
        onClick={handleContinue}
        disabled={loading}
        className="mt-8 flex h-[52px] w-full items-center justify-center rounded-xl bg-purple-600 text-base text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Continue'}
      </button>

      {/* Bottom fill */}
      <div className="flex-1" />

      {/* Already have account */}
      <div className="flex items-center justify-center gap-1 pb-8">
        <span className="text-sm text-neutral-400">Already have an account?</span>
        <Link to="/login" className="text-sm font-semibold text-purple-300">
          Log In
        </Link>
      </div>
    </div>
  );
}
