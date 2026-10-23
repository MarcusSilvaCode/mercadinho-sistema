import { FormEvent, ReactNode, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";
import type { SystemUser } from "../../lib/types";
import { inputClass } from "../ui/Field";

const MIN_PASSWORD = 6;

/** Usuário logado troca a própria senha (exige a senha atual). */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const { error, setError, submitting, run } = useSubmit();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = checkNewPassword(newPassword, confirmPassword);
    if (problem) return setError(problem);
    await run(async () => {
      await api.post("/auth/change-password", { currentPassword, newPassword, confirmPassword });
      setDone(true);
    });
  }

  if (done) {
    return (
      <ModalShell title="Trocar minha senha" onClose={onClose}>
        <p className="text-sm text-ink-700">Senha alterada. Use a nova senha no próximo login.</p>
        <button onClick={onClose} className={`${primaryButton} mt-4 w-full`}>
          OK
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Trocar minha senha" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField label="Senha atual" value={currentPassword} onChange={setCurrentPassword} autoFocus autoComplete="current-password" />
        <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} hint={`Mínimo de ${MIN_PASSWORD} caracteres.`} />
        <PasswordField label="Confirme a nova senha" value={confirmPassword} onChange={setConfirmPassword} />
        <ErrorBox error={error} />
        <Actions onClose={onClose} submitting={submitting} label="Trocar senha" disabled={!currentPassword || !newPassword} />
      </form>
    </ModalShell>
  );
}

/** Admin cadastra um novo usuário. */
export function CreateUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { error, setError, submitting, run } = useSubmit();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = checkNewPassword(password, confirmPassword);
    if (problem) return setError(problem);
    await run(async () => {
      await api.post("/users", { fullName: fullName.trim(), username: username.trim(), password, confirmPassword });
      onSaved();
    });
  }

  return (
    <ModalShell title="Novo usuário" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome completo">
          <input autoFocus className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Usuário (para entrar no sistema)" hint="Letras, números, ponto, hífen ou underscore. Ex.: maria.silva">
          <input
            className={inputClass}
            autoCapitalize="none"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
          />
        </Field>
        <PasswordField label="Senha inicial" value={password} onChange={setPassword} hint={`Mínimo de ${MIN_PASSWORD} caracteres. A pessoa pode trocar depois.`} />
        <PasswordField label="Confirme a senha" value={confirmPassword} onChange={setConfirmPassword} />
        <ErrorBox error={error} />
        <Actions
          onClose={onClose}
          submitting={submitting}
          label="Criar usuário"
          disabled={fullName.trim().length < 3 || username.length < 3 || !password}
        />
      </form>
    </ModalShell>
  );
}

/** Admin define uma nova senha para outro usuário (ex.: funcionário esqueceu). */
export function ResetPasswordModal({ user, onClose, onSaved }: { user: SystemUser; onClose: () => void; onSaved: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { error, setError, submitting, run } = useSubmit();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = checkNewPassword(newPassword, confirmPassword);
    if (problem) return setError(problem);
    await run(async () => {
      await api.post(`/users/${user.id}/reset-password`, { newPassword, confirmPassword });
      onSaved();
    });
  }

  return (
    <ModalShell title={`Redefinir senha de ${user.fullName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} autoFocus hint={`Mínimo de ${MIN_PASSWORD} caracteres.`} />
        <PasswordField label="Confirme a nova senha" value={confirmPassword} onChange={setConfirmPassword} />
        <ErrorBox error={error} />
        <Actions onClose={onClose} submitting={submitting} label="Redefinir senha" disabled={!newPassword} />
      </form>
    </ModalShell>
  );
}

function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (password !== confirm) return "As senhas não coincidem.";
  return null;
}

function useSubmit() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return { error, setError, submitting, run };
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-surface-muted hover:text-ink-700">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  hint,
  autoFocus,
  autoComplete = "new-password",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className={`${inputClass} pr-10`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Esconder senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-300 hover:text-ink-500"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>;
}

function Actions({
  onClose,
  submitting,
  label,
  disabled,
}: {
  onClose: () => void;
  submitting: boolean;
  label: string;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] border border-surface-border px-4 h-11 text-sm font-semibold text-ink-900 transition hover:bg-brand-50 hover:border-brand-200 bg-surface"
      >
        Cancelar
      </button>
      <button type="submit" disabled={submitting || disabled} className={`${primaryButton} flex-1`}>
        {submitting ? "Salvando..." : label}
      </button>
    </div>
  );
}


const primaryButton =
  "rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50";
