import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function AccountCreatedPage() {
  const navigate = useNavigate();
  const [dots, setDots] = useState(0);

  useEffect(() => {
    // Animate dots
    const dotInterval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 500);

    // Redirect to home after 2.5 seconds
    const redirectTimeout = setTimeout(() => {
      void navigate('/');
    }, 2500);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(redirectTimeout);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D1F] px-6 text-neutral-50">
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Success checkmark */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500 to-emerald-500">
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
          <path
            d="M24 0L9 15L0 6L1.5 4.5L9 12L22.5 0L24 0Z"
            fill="#10B981"
            stroke="#10B981"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* Spacer */}
      <div className="h-8" />

      {/* Account created text */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-[28px] font-bold text-white">Account created!</h1>
        <p className="text-center text-base leading-relaxed text-neutral-400">
          Welcome to LIFEY
        </p>
      </div>

      {/* Spacer */}
      <div className="h-12" />

      {/* Loading indicator */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full bg-purple-600/40 ${dots >= 1 ? 'opacity-70' : 'opacity-40'}`}
          />
          <div
            className={`h-2 w-2 rounded-full bg-purple-600 ${dots >= 2 ? 'opacity-70' : 'opacity-40'}`}
          />
          <div
            className={`h-2 w-2 rounded-full bg-purple-600 ${dots >= 3 ? 'opacity-70' : 'opacity-40'}`}
          />
        </div>
        <p className="text-sm text-neutral-600">Taking you to the app{'.'.repeat(dots)}</p>
      </div>

      {/* Bottom fill */}
      <div className="flex-1" />
    </div>
  );
}
