import { useEffect, useState } from "react";
import { KeyRound, Plus, Power } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatDate } from "../lib/format";
import type { SystemUser } from "../lib/types";
import { useAuthStore } from "../store/authStore";
import { ChangePasswordModal, CreateUserModal, ResetPasswordModal } from "../components/users/UserModals";

export function UsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<SystemUser | null>(null);
  const [changingOwn, setChangingOwn] = useState(false);

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
    const action = user.active ? "desativar" : "reativar";
    if (!window.confirm(`Deseja ${action} o usuário ${user.fullName}?`)) return;
    setError(null);
    try {
      await api.patch(`/users/${user.id}`, { active: !user.active });
      setNotice(`Usuário ${user.fullName} ${user.active ? "desativado" : "reativado"}.`);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Usuários</h1>
          <p className="text-sm text-ink-500">Quem pode entrar no sistema. Usuários desativados não conseguem fazer login.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setChangingOwn(true)}
            className="flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
          >
            <KeyRound size={15} /> Trocar minha senha
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <Plus size={16} /> Novo usuário
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}
      {notice && <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-600">{notice}</div>}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Último acesso</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
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
                  <tr key={user.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {user.fullName}
                      {isMe && <span className="ml-1.5 text-xs font-normal text-ink-500">(você)</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-500">@{user.username}</td>
                    <td className="px-4 py-3 text-ink-500">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Nunca"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.active ? "bg-brand-50 text-brand-600" : "bg-surface-muted text-ink-500"
                        }`}
                      >
                        {user.active ? "Ativo" : "Desativado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => (isMe ? setChangingOwn(true) : setResetting(user))}
                          title={isMe ? "Trocar minha senha" : "Redefinir senha"}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-muted hover:text-ink-900"
                        >
                          <KeyRound size={15} />
                        </button>
                        {!isMe && (
                          <button
                            onClick={() => toggleActive(user)}
                            title={user.active ? "Desativar" : "Reativar"}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-surface-muted hover:text-ink-900"
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
            setNotice("Usuário criado.");
            load();
          }}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={() => {
            setNotice(`Senha de ${resetting.fullName} redefinida.`);
            setResetting(null);
          }}
        />
      )}
      {changingOwn && <ChangePasswordModal onClose={() => setChangingOwn(false)} />}
    </div>
  );
}
