import { Navigate, useLocation } from "react-router-dom";

import { getAccessToken } from "@/shared/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = getAccessToken();

  if (!token) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}