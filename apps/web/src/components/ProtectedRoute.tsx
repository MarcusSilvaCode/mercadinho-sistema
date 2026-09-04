import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    if (status === "loading") fetchMe();
  }, [status, fetchMe]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-muted text-sm text-ink-500">
        Carregando...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
