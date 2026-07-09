import { type RouteObject, useRoutes } from "react-router-dom";

import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { RequestResetPage } from "@/features/auth/RequestResetPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { InvitePage } from "@/features/household/InvitePage";
import { MembersPage } from "@/features/household/MembersPage";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { AdminRoute } from "@/shared/components/AdminRoute";

const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <div className="p-8 text-center text-lg">Welcome to LIFEY</div>
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/reset-password",
    element: <RequestResetPage />,
  },
  {
    path: "/reset-password/confirm",
    element: <ResetPasswordPage />,
  },
  {
    path: "/household/members",
    element: (
      <ProtectedRoute>
        <MembersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/household/invites",
    element: (
      <ProtectedRoute>
        <AdminRoute>
          <InvitePage />
        </AdminRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <div className="p-8 text-center text-lg">404 — Page not found</div>,
  },
];

export function AppRouter() {
  return useRoutes(routes);
}