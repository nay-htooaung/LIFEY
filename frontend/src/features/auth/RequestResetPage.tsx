import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useRequestPasswordReset } from "./hooks";

const resetSchema = z.object({
  email: z.string().email("Invalid email"),
});

type ResetFormData = z.infer<typeof resetSchema>;

export function RequestResetPage() {
  const [submitted, setSubmitted] = useState(false);
  const requestMutation = useRequestPasswordReset();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(data: ResetFormData) {
    try {
      await requestMutation.mutateAsync(data);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <h1 className="mb-4 text-2xl font-bold">Check your email</h1>
        <p className="text-gray-600">
          If the email exists, a reset link has been sent.
        </p>
        <p className="mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="mb-6 text-2xl font-bold">Reset password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register("email")}
            className="w-full rounded border px-3 py-2"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-blue-600 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}