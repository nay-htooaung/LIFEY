import { useMutation } from "@tanstack/react-query";

import { api } from "@/api/client";
import { setAccessToken } from "@/shared/auth";

import type {
  LoginRequest,
  LoginResponseData,
  RegisterRequest,
  RegisterResponseData,
  ResetPasswordConfirm,
  ResetPasswordRequest,
} from "./types";

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = (await api.post(
        "/auth/register",
        data,
      )) as unknown as RegisterResponseData;
      setAccessToken(response.access_token);
      return response;
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = (await api.post(
        "/auth/login",
        data,
      )) as unknown as LoginResponseData;
      setAccessToken(response.access_token);
      return response;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
      setAccessToken(null);
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      return (await api.post(
        "/auth/reset-password/request",
        data,
      )) as unknown as { reset_token?: string | null };
    },
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async (data: ResetPasswordConfirm) => {
      return (await api.post(
        "/auth/reset-password/confirm",
        data,
      )) as unknown as void;
    },
  });
}