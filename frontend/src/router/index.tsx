import { type RouteObject, useRoutes } from "react-router-dom";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <div className="p-8 text-center text-lg">Welcome to LIFEY</div>,
  },
  {
    path: "/login",
    element: <div className="p-8 text-center text-lg">Login</div>,
  },
  {
    path: "*",
    element: <div className="p-8 text-center text-lg">404 — Page not found</div>,
  },
];

export function AppRouter() {
  return useRoutes(routes);
}
