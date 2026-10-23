import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { UnlockModal } from "../UnlockModal";
import { Toaster } from "../ui/Toast";
import { useAuthStore } from "../../store/authStore";
import { useCashierStore } from "../../store/cashierStore";
import { useStoreSettings } from "../../store/storeSettings";
import { useInactivityTimer } from "../../hooks/useInactivityTimer";

export function AppShell() {
  const locked = useAuthStore((s) => s.locked);
  const status = useAuthStore((s) => s.status);
  const fetchCashier = useCashierStore((s) => s.fetchCurrent);
  const fetchStoreSettings = useStoreSettings((s) => s.fetch);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useInactivityTimer(status === "authenticated");

  useEffect(() => {
    if (status === "authenticated") {
      fetchCashier();
      fetchStoreSettings();
    }
  }, [status, fetchCashier, fetchStoreSettings]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {locked && <UnlockModal />}
      <Toaster />
    </div>
  );
}
