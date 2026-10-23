import { useState } from "react";
import { KeyRound, Lock, LogOut, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useCashierStore } from "../../store/cashierStore";
import { formatTime } from "../../lib/format";
import { ChangePasswordModal } from "../users/UserModals";
import { IconButton } from "../ui/Button";

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
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-surface-border bg-surface px-3 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton label="Abrir menu" onClick={onOpenSidebar} className="md:hidden">
          <Menu size={20} />
        </IconButton>

        {/* Status do caixa: aberto/fechado e desde quando — o valor fica na tela do Caixa */}
        <Link
          to="/caixa"
          className="flex min-w-0 items-center gap-2 rounded-full border border-surface-border px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:border-brand-200 hover:bg-brand-50"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${loading ? "bg-ink-300" : session ? "bg-success-500" : "bg-danger-500"}`}
            aria-hidden="true"
          />
          <span className="truncate">
            {loading
              ? "Verificando caixa..."
              : session
                ? <>Caixa aberto<span className="hidden sm:inline"> · desde {formatTime(session.openedAt)}</span></>
                : "Caixa fechado"}
          </span>
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <div className="mr-2 hidden text-right sm:block">
          <p className="text-sm font-semibold leading-tight text-ink-900">{user?.fullName}</p>
          <p className="text-xs leading-tight text-ink-500">@{user?.username}</p>
        </div>
        <IconButton label="Trocar minha senha" onClick={() => setChangingPassword(true)}>
          <KeyRound size={18} />
        </IconButton>
        <IconButton label="Bloquear tela" onClick={lock}>
          <Lock size={18} />
        </IconButton>
        <IconButton label="Sair" tone="danger" onClick={() => logout()}>
          <LogOut size={18} />
        </IconButton>
      </div>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </header>
  );
}
