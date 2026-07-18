import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { signUpWithInviteCode } from '@/features/auth/services/authService';

interface SignUpPageProps {
  onBack: () => void;
}

const signUpSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

export function SignUpPage({ onBack }: SignUpPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { error, setError, validatedCode } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      const result = await signUpWithInviteCode(
        data.email,
        data.password,
        validatedCode || '',
      );

      if (result.success) {
        useAuthStore.getState().setPhase('account_created');
      } else {
        setFormError('root', { message: result.error || 'Something went wrong' });
      }
    } catch (err) {
      setFormError('root', {
        message: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  };

  return (
    <div className="flex min-h-dvh min-w-[390px] flex-col bg-surface px-6 text-neutral-50">
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Back button + Code accepted badge */}
      <div className="flex items-center gap-3 px-0">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-10px bg-surface-container"
          aria-label="Back"
        >
          <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
            <path d="M9 17L1 9L9 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2 rounded-20px bg-surface-container px-3.5 py-1.5">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M9.34 0L3.5 5.84L0.66 3L0 3.66L3.5 7.16L10 0.66L9.34 0Z"
              fill="#10B981"
            />
          </svg>
          <span className="text-[13px] text-neutral-400">Code accepted</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-2" />

      {/* Create your account */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2.5xl font-bold text-white">Create your account</h1>
        <p className="text-[15px] leading-relaxed text-neutral-400">
          Set up your email and password to get started
        </p>
      </div>

      {/* Spacer */}
      <div className="h-8" />

      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}>
        {/* Email field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Email"
            {...register('email', {
              onChange: () => {
                if (error) setError(null);
              },
            })}
            className="h-12 w-full rounded-10px border border-outline bg-surface-container px-4 text-white placeholder-neutral-500 outline-none transition-colors focus:border-purple-500"
          />
          {errors.email?.message && (
            <p className="text-sm leading-relaxed text-red-500" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Spacer */}
        <div className="h-5" />

        {/* Password field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              {...register('password', {
                onChange: () => {
                  if (error) setError(null);
                },
              })}
              className="h-12 w-full rounded-10px border border-outline bg-surface-container px-4 text-white placeholder-neutral-500 outline-none transition-colors focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    fill="#9CA3AF"
                  />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                    fill="#9CA3AF"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.password?.message && (
            <p className="text-sm leading-relaxed text-red-500" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Spacer */}
        <div className="h-5" />

        {/* Confirm Password field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white" htmlFor="confirm-password">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              {...register('confirmPassword', {
                onChange: () => {
                  if (error) setError(null);
                },
              })}
              className="h-12 w-full rounded-10px border border-outline bg-surface-container px-4 text-white placeholder-neutral-500 outline-none transition-colors focus:border-purple-500"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    fill="#9CA3AF"
                  />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                    fill="#9CA3AF"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword?.message && (
            <p className="text-sm leading-relaxed text-red-500" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Root error message (server-side) */}
        {errors.root?.message && (
          <p className="mt-3 text-sm leading-relaxed text-red-500" role="alert">
            {errors.root.message}
          </p>
        )}

        {/* Legacy error (store-level) */}
        {!errors.root?.message && error && (
          <p className="mt-3 text-sm leading-relaxed text-red-500" role="alert">
            {error}
          </p>
        )}

        {/* Create Account button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-8 flex h-[52px] w-full items-center justify-center rounded-xl bg-purple-600 text-base text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      {/* Bottom fill */}
      <div className="flex-1" />

      {/* Terms */}
      <p className="pb-8 text-center text-xs leading-relaxed text-neutral-500">
        By signing up, you agree to our
        <br />
        Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
