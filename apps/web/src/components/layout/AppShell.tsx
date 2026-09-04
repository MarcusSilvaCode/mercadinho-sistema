import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { UnlockModal } from "../UnlockModal";
import { useAuthStore } from "../../store/authStore";
import { useCashierStore } from "../../store/cashierStore";
import { useInactivityTimer } from "../../hooks/useInactivityTimer";

export function AppShell() {
  const locked = useAuthStore((s) => s.locked);
  const status = useAuthStore((s) => s.status);
  const fetchCashier = useCashierStore((s) => s.fetchCurrent);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useInactivityTimer(status === "authenticated");

  useEffect(() => {
    if (status === "authenticated") fetchCashier();
  }, [status, fetchCashier]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>

      {locked && <UnlockModal />}
    </div>
  );
}
