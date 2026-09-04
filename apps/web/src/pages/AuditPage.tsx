import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import type { AuditLogEntry } from "../lib/types";

const PAGE_SIZE = 30;

// Mesma lista fixa do enum AuditAction do schema (Fase 2) — não muda em
// runtime, então não faz sentido buscar isso de uma API.
const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login",
  LOGOUT: "Logout",
  LOGIN_FALHOU: "Falha de login",
  VENDA_CRIADA: "Venda criada",
  VENDA_CANCELADA: "Venda cancelada",
  VENDA_DEVOLVIDA: "Venda devolvida",
  DESCONTO_APLICADO: "Desconto aplicado",
  PRECO_ALTERADO: "Preço alterado",
  PRODUTO_CRIADO: "Produto criado",
  PRODUTO_ALTERADO: "Produto alterado",
  PRODUTO_INATIVADO: "Produto inativado",
  CATEGORIA_CRIADA: "Categoria criada",
  CATEGORIA_ALTERADA: "Categoria alterada",
  CATEGORIA_INATIVADA: "Categoria inativada",
  ENTRADA_ESTOQUE: "Entrada de estoque",
  AJUSTE_ESTOQUE: "Ajuste de estoque",
  INVENTARIO_REALIZADO: "Inventário realizado",
  VENDA_SEM_ESTOQUE_AUTORIZADA: "Venda sem estoque autorizada",
  CAIXA_ABERTO: "Caixa aberto",
  CAIXA_FECHADO: "Caixa fechado",
  SANGRIA_REGISTRADA: "Sangria registrada",
  SUPRIMENTO_REGISTRADO: "Suprimento registrado",
  CONFIGURACAO_ALTERADA: "Configuração alterada",
  SENHA_REDEFINIDA: "Senha redefinida",
  IMPORTACAO_PRODUTOS: "Importação de produtos",
  BACKUP_EXECUTADO: "Backup executado",
};

const ENTITY_OPTIONS = ["Product", "Category", "Sale", "User", "CashierSession", "Inventory", "Purchase"];

export function AuditPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await api.get<{ items: AuditLogEntry[]; total: number }>("/audit", {
      params: {
        action: action || undefined,
        entity: entity || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
      },
    });
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action, entity, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink-900">Auditoria</h1>
        <p className="text-sm text-ink-500">{total} registro(s) — histórico de todas as ações do sistema</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
          className="rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todas as ações</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={entity}
          onChange={(e) => {
            setPage(1);
            setEntity(e.target.value);
          }}
          className="rounded-lg border border-surface-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todas as entidades</option>
          {ENTITY_OPTIONS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
              if (!to) setTo(e.target.value);
            }}
            className="rounded-lg border border-surface-border px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          <span className="text-sm text-ink-500">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
              if (!from) setFrom(e.target.value);
            }}
            className="rounded-lg border border-surface-border px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          {(from || to) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
                setPage(1);
              }}
              className="text-xs font-medium text-ink-500 underline"
            >
              limpar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">Data/hora</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Ação</th>
              <th className="px-4 py-3">Entidade</th>
              <th className="px-4 py-3">Detalhes</th>
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
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  Nenhum registro encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
            {items.map((log) => (
              <tr key={log.id} className="border-b border-surface-border align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-ink-500">{formatDate(log.createdAt)}</td>
                <td className="px-4 py-3 text-ink-900">{log.user?.fullName ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {log.entity ? `${log.entity}${log.entityId ? ` (${log.entityId.slice(0, 8)})` : ""}` : "—"}
                </td>
                <td className="max-w-xs px-4 py-3 text-xs text-ink-500">
                  {log.details ? (
                    <code className="break-words">{JSON.stringify(log.details)}</code>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-sm text-ink-500">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-surface-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-surface-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
