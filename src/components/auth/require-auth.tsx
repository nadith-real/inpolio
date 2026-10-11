import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useStore } from "@/lib/store";
import { firstAllowedPath, permissionForPath } from "@/lib/nav";

export function RequireAuth() {
  const { ready, session, setupNeeded, can } = useStore();
  const location = useLocation();

  if (!ready) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!session || setupNeeded) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  const needed = permissionForPath(location.pathname);
  if (needed && !can(needed)) {
    return <Navigate to={firstAllowedPath(can)} replace />;
  }
  return <Outlet />;
}

export function GuestOnly() {
  const { ready, session, setupNeeded, can } = useStore();
  if (!ready) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (session && !setupNeeded) {
    return <Navigate to={firstAllowedPath(can)} replace />;
  }
  return <Outlet />;
}
