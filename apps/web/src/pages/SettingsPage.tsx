import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, DatabaseBackup, PlayCircle, XCircle } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { formatDate } from "../lib/format";
import type { BackupLogEntry, StoreSettings } from "../lib/types";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ settings: StoreSettings }>("/settings").then(({ data }) => {
      setSettings(data.settings);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const { data } = await api.patch<{ settings: StoreSettings }>("/settings", {
        storeName: settings.storeName,
        shortName: settings.shortName || undefined,
        document: settings.document || undefined,
        phone: settings.phone || undefined,
        whatsapp: settings.whatsapp || undefined,
        email: settings.email || undefined,
        address: settings.address || undefined,
        defaultMargin: Number(settings.defaultMargin),
        maxDiscountPercent: Number(settings.maxDiscountPercent),
        sessionTimeoutMin: settings.sessionTimeoutMin,
        backupDayOfWeek: settings.backupDayOfWeek,
        backupHour: settings.backupHour,
      });
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <p className="text-sm text-ink-500">Carregando...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink-900">Configurações</h1>
        <p className="text-sm text-ink-500">Dados da loja, regras de negócio e backup.</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 space-y-6">
        <Section title="Dados da loja">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome da loja">
              <input
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            <Field label="Nome curto">
              <input
                value={settings.shortName ?? ""}
                onChange={(e) => setSettings({ ...settings, shortName: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            <Field label="CNPJ/CPF">
              <input
                value={settings.document ?? ""}
                onChange={(e) => setSettings({ ...settings, document: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            <Field label="Telefone">
              <input
                value={settings.phone ?? ""}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={settings.whatsapp ?? ""}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={settings.email ?? ""}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            <Field label="Endereço" full>
              <input
                value={settings.address ?? ""}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
          </div>
        </Section>

        <Section title="Regras gerais">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Margem de lucro padrão (%)">
              <input
                type="number"
                step="0.1"
                min={0}
                value={settings.defaultMargin}
                onChange={(e) => setSettings({ ...settings, defaultMargin: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 font-money"
              />
            </Field>
            <Field label="Limite máximo de desconto (%)">
              <input
                type="number"
                step="0.1"
                min={0}
                max={100}
                value={settings.maxDiscountPercent}
                onChange={(e) => setSettings({ ...settings, maxDiscountPercent: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 font-money"
              />
            </Field>
            <Field label="Bloqueio de sessão por inatividade (min)">
              <input
                type="number"
                min={1}
                value={settings.sessionTimeoutMin}
                onChange={(e) => setSettings({ ...settings, sessionTimeoutMin: Number(e.target.value) })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 font-money"
              />
            </Field>
          </div>
        </Section>

        <Section title="Backup automático">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Dia da semana">
              <select
                value={settings.backupDayOfWeek}
                onChange={(e) => setSettings({ ...settings, backupDayOfWeek: Number(e.target.value) })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {WEEKDAYS.map((day, i) => (
                  <option key={i} value={i}>
                    {day}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Horário">
              <select
                value={settings.backupHour}
                onChange={(e) => setSettings({ ...settings, backupHour: Number(e.target.value) })}
                className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {error && <div className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-brand-600">
              <CheckCircle2 size={15} /> Salvo com sucesso
            </span>
          )}
        </div>
      </form>

      <BackupHistorySection />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-sm font-semibold text-ink-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}

function BackupHistorySection() {
  const [backups, setBackups] = useState<BackupLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get<{ items: BackupLogEntry[] }>("/backup", { params: { pageSize: 10 } });
    setBackups(data.items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRunBackup() {
    setRunError(null);
    setRunning(true);
    try {
      await api.post("/backup/run");
      await load();
    } catch (err) {
      setRunError(getApiErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
          <DatabaseBackup size={16} /> Histórico de backups
        </h2>
        <button
          onClick={handleRunBackup}
          disabled={running}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          <PlayCircle size={15} /> {running ? "Executando..." : "Fazer backup agora"}
        </button>
      </div>

      {runError && (
        <div className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{runError}</div>
      )}

      {loading ? (
        <p className="text-sm text-ink-500">Carregando...</p>
      ) : backups.length === 0 ? (
        <p className="text-sm text-ink-500">Nenhum backup registrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {backups.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                {b.status === "SUCESSO" ? (
                  <CheckCircle2 size={15} className="text-brand-600" />
                ) : (
                  <XCircle size={15} className="text-danger-500" />
                )}
                <span className="text-ink-900">{b.fileName ?? "Backup"}</span>
                {b.errorMessage && <span className="text-xs text-danger-500">— {b.errorMessage}</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-500">
                {b.sizeBytes && <span>{(b.sizeBytes / 1024).toFixed(1)} KB</span>}
                <span>{formatDate(b.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
