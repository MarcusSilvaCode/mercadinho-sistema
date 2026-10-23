import { FormEvent, useState } from "react";
import { Lock } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { api, getApiErrorMessage } from "../lib/api";

export function UnlockModal() {
  const user = useAuthStore((s) => s.user);
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/verify-password", { password });
      setPassword("");
      unlock();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <Lock size={20} />
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">Sessão bloqueada</h2>
          <p className="text-sm text-ink-500">
            {user?.fullName ?? "Usuário"}, digite sua senha para continuar. Nada foi perdido.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-3 w-full rounded-[10px] border border-surface-border px-3 h-11 text-[15px] outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-surface placeholder:text-ink-300"
            placeholder="Senha"
          />

          {error && (
            <div className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="inline-flex items-center justify-center gap-2 mb-2 w-full rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Verificando..." : "Desbloquear"}
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium text-ink-500 transition hover:bg-surface-muted"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
