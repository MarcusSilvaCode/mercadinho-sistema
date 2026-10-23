import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useStoreSettings } from "../store/storeSettings";
import { getApiErrorMessage } from "../lib/api";
import { Button } from "../components/ui/Button";
import { ErrorMessage, Input } from "../components/ui/Field";
import { TileBand } from "../components/ui/Layout";

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const storeName = useStoreSettings((s) => s.storeName);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      {/* Painel da marca: azulejos + nome da loja */}
      <aside className="relative flex flex-col overflow-hidden bg-brand-500 text-white lg:w-[44%]">
        <TileBand columns={12} rows={1} className="lg:hidden" />
        <div className="hidden flex-1 lg:block">
          <TileBand columns={6} rows={6} className="opacity-95" />
        </div>
        <div className="px-6 py-8 lg:px-12 lg:py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">Sistema de gestão</p>
          <p className="mt-2 font-display text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">{storeName}</p>
        </div>
      </aside>

      <main className="flex flex-1 items-start justify-center px-6 py-10 lg:items-center">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-ink-900">Entrar</h1>
          <p className="mt-1 text-[15px] text-ink-500">Use seu usuário e senha do sistema.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-ink-700">
                Usuário
              </label>
              <Input
                id="username"
                type="text"
                autoFocus
                autoCapitalize="none"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-300 hover:text-ink-700"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <ErrorMessage>{error}</ErrorMessage>

            <Button type="submit" size="lg" className="w-full" disabled={submitting || !username || !password}>
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
