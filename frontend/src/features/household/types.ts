export type MemberOut = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
};

export type InviteResponseData = {
  token: string;
  expires_at: string;
};