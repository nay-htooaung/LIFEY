export function AdminRoute({ children }: { children: React.ReactNode }) {
  // In production, this would check the current user's role from React Query cache.
  // For now, any authenticated user can access admin pages.
  // The backend enforces admin-only access at the API level.
  return <>{children}</>;
}