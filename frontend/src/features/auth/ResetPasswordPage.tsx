import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useConfirmPasswordReset } from "./hooks";

const resetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});

type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const confirmMutation = useConfirmPasswordReset();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: tokenFromUrl,
    },
  });

  async function onSubmit(data: ResetFormData) {
    try {
      await confirmMutation.mutateAsync(data);
      setSuccess(true);
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError("root", {
        message: apiError?.message || "Failed to reset password.",
      });
    }
  }

  if (success) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <h1 className="mb-4 text-2xl font-bold">Password updated</h1>
        <p className="text-gray-600">
          Your password has been updated successfully.
        </p>
        <p className="mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">
            Log in with new password
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-6 text-2xl font-bold">Set new password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="token" className="mb-1 block text-sm font-medium">
            Reset token
          </label>
          <input
            id="token"
            type="text"
            {...register("token")}
            className="w-full rounded border px-3 py-2"
          />
          {errors.token && (
            <p className="mt-1 text-sm text-red-600">{errors.token.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="new_password"
            className="mb-1 block text-sm font-medium"
          >
            New password
          </label>
          <input
            id="new_password"
            type="password"
            {...register("new_password")}
            className="w-full rounded border px-3 py-2"
          />
          {errors.new_password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.new_password.message}
            </p>
          )}
        </div>

        {errors.root && (
          <p className="text-sm text-red-600">{errors.root.message}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}