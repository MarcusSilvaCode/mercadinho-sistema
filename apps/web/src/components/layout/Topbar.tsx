import { useState } from "react";
import { KeyRound, Lock, LogOut, Menu, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useCashierStore } from "../../store/cashierStore";
import { formatCurrency } from "../../lib/format";
import { ChangePasswordModal } from "../users/UserModals";

interface TopbarProps {
  onOpenSidebar: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const lock = useAuthStore((s) => s.lock);
  const logout = useAuthStore((s) => s.logout);
  const { session, loading } = useCashierStore();
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b border-surface-border bg-surface px-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onOpenSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-muted md:hidden"
        >
          <Menu size={18} />
        </button>

        <Link
          to="/caixa"
          className={`flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition md:px-3 ${
            session
              ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
              : "bg-surface-muted text-ink-500 hover:bg-surface-border/60"
          }`}
        >
          <Wallet size={15} className="shrink-0" />
          <span className="truncate">
            {loading
              ? "Verificando caixa..."
              : session
                ? `Caixa aberto${" · " + formatCurrency(session.openingAmount)}`
                : "Caixa fechado"}
          </span>
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight text-ink-900">{user?.fullName}</p>
          <p className="text-xs leading-tight text-ink-500">@{user?.username}</p>
        </div>

        <button
          onClick={() => setChangingPassword(true)}
          title="Trocar minha senha"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-surface-muted hover:text-ink-900"
        >
          <KeyRound size={16} />
        </button>

        <button
          onClick={lock}
          title="Bloquear tela"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-surface-muted hover:text-ink-900"
        >
          <Lock size={16} />
        </button>

        <button
          onClick={() => logout()}
          title="Sair"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-danger-50 hover:text-danger-500"
        >
          <LogOut size={16} />
        </button>
      </div>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </header>
  );
}
