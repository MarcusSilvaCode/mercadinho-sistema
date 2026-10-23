import { useEffect, useState } from "react";
import { KeyRound, Plus, Power } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatDate } from "../lib/format";
import type { SystemUser } from "../lib/types";
import { useAuthStore } from "../store/authStore";
import { ChangePasswordModal, CreateUserModal, ResetPasswordModal } from "../components/users/UserModals";
import { ConfirmModal } from "../components/ui/Modal";
import { toast } from "../components/ui/Toast";

export function UsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<SystemUser | null>(null);
  const [changingOwn, setChangingOwn] = useState(false);
  const [confirming, setConfirming] = useState<SystemUser | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get<{ users: SystemUser[] }>("/users");
      setUsers(data.users);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(user: SystemUser) {
    setError(null);
    try {
      await api.patch(`/users/${user.id}`, { active: !user.active });
      toast.success(`${user.fullName} ${user.active ? "foi desativado" : "foi reativado"}.`);
      setConfirming(null);
      load();
    } catch (err) {
      setConfirming(null);
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">Usuários</h1>
          <p className="mt-1 text-[15px] text-ink-500">Quem pode entrar no sistema. Usuários desativados não conseguem fazer login.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setChangingOwn(true)}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-surface-border px-4 h-11 text-sm font-semibold text-ink-900 transition hover:bg-brand-50 hover:border-brand-200 bg-surface"
          >
            <KeyRound size={15} /> Trocar minha senha
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            <Plus size={16} /> Novo usuário
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">
                <th className="px-5 py-3.5">Nome</th>
                <th className="px-5 py-3.5">Usuário</th>
                <th className="px-5 py-3.5">Último acesso</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                    Carregando...
                  </td>
                </tr>
              )}
              {users.map((user) => {
                const isMe = user.id === currentUserId;
                return (
                  <tr key={user.id} className="border-b border-surface-border last:border-0 transition-colors hover:bg-surface-muted/60">
                    <td className="px-5 py-3.5 font-medium text-ink-900">
                      {user.fullName}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-ink-500">(você)</span>}
                    </td>
                    <td className="px-5 py-3.5 text-ink-500">@{user.username}</td>
                    <td className="px-5 py-3.5 text-ink-500">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Nunca"}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.active ? "bg-brand-50 text-brand-600" : "bg-surface-muted text-ink-500"
                        }`}
                      >
                        {user.active ? "Ativo" : "Desativado"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => (isMe ? setChangingOwn(true) : setResetting(user))}
                          title={isMe ? "Trocar minha senha" : "Redefinir senha"}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-600"
                        >
                          <KeyRound size={15} />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => setConfirming(user)}
                            title={user.active ? "Desativar" : "Reativar"}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-600"
                          >
                            <Power size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast.success("Usuário criado.");
            load();
          }}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={() => {
            toast.success(`Senha de ${resetting.fullName} redefinida.`);
            setResetting(null);
          }}
        />
      )}
      {changingOwn && <ChangePasswordModal onClose={() => setChangingOwn(false)} />}
      {confirming && (
        <ConfirmModal
          title={confirming.active ? "Desativar usuário?" : "Reativar usuário?"}
          message={
            confirming.active ? (
              <>
                <strong className="font-semibold text-ink-900">{confirming.fullName}</strong> não vai mais conseguir
                entrar no sistema. O histórico de vendas dele continua guardado.
              </>
            ) : (
              <>
                <strong className="font-semibold text-ink-900">{confirming.fullName}</strong> volta a poder entrar no
                sistema com a senha atual.
              </>
            )
          }
          confirmLabel={confirming.active ? "Desativar" : "Reativar"}
          tone={confirming.active ? "danger" : "primary"}
          onConfirm={() => toggleActive(confirming)}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
