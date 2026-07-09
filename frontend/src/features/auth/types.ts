export type UserOut = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
};

export type HouseholdOut = {
  id: number;
  name: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  invite_token?: string | null;
};

export type RegisterResponseData = {
  user: UserOut;
  household: HouseholdOut;
  access_token: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponseData = RegisterResponseData;

export type RefreshResponseData = {
  access_token: string;
};

export type ResetPasswordRequest = {
  email: string;
};

export type ResetPasswordConfirm = {
  token: string;
  new_password: string;
};

export type MessageResponse = {
  message: string;
};

export type ResetPasswordRequestData = {
  message: string;
  reset_token: string | null;
};