import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { formatDate, formatTime } from "../lib/format";
import { ACTION_LABELS, ENTITY_LABELS, auditTone, describeAudit } from "../lib/auditDescribe";
import type { AuditLogEntry } from "../lib/types";
import { Input, Select } from "../components/ui/Field";
import { Badge, EmptyState, PageHeader, Skeleton } from "../components/ui/Layout";
import { Pagination, TableCard, tdClass, thClass, theadRowClass, trClass } from "../components/ui/Table";

const PAGE_SIZE = 30;

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
      <PageHeader title="Auditoria" description={`${total} registros · tudo o que foi feito no sistema, por quem e quando`} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[220px_200px_auto]">
        <Select
          aria-label="Filtrar por ação"
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
        >
          <option value="">Todas as ações</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filtrar por área"
          value={entity}
          onChange={(e) => {
            setPage(1);
            setEntity(e.target.value);
          }}
        >
          <option value="">Todas as áreas</option>
          {Object.entries(ENTITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label="Data inicial"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
              if (!to) setTo(e.target.value);
            }}
            className="w-auto"
          />
          <span className="text-sm text-ink-500">até</span>
          <Input
            type="date"
            aria-label="Data final"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
              if (!from) setFrom(e.target.value);
            }}
            className="w-auto"
          />
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
                setPage(1);
              }}
              className="text-sm font-semibold text-brand-500 hover:text-brand-600"
            >
              Limpar datas
            </button>
          )}
        </div>
      </div>

      <TableCard footer={<Pagination page={page} totalPages={totalPages} onChange={setPage} />}>
        {loading && items.length === 0 ? (
          <Skeleton rows={8} />
        ) : items.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nenhum registro" description="Nada encontrado para os filtros escolhidos." />
        ) : (
          <table className="w-full min-w-[640px] text-[15px]">
            <thead>
              <tr className={theadRowClass}>
                <th className={thClass}>Quando</th>
                <th className={thClass}>Quem</th>
                <th className={thClass}>O que aconteceu</th>
              </tr>
            </thead>
            <tbody className={loading ? "opacity-60" : ""}>
              {items.map((log) => {
                const detail = describeAudit(log);
                return (
                  <tr key={log.id} className={trClass}>
                    <td className={`${tdClass} whitespace-nowrap`}>
                      <p className="text-ink-900">{formatDate(log.createdAt)}</p>
                      <p className="text-sm text-ink-500">{formatTime(log.createdAt)}</p>
                    </td>
                    <td className={`${tdClass} text-ink-900`}>{log.user?.fullName ?? "Sistema"}</td>
                    <td className={tdClass}>
                      <Badge tone={auditTone(log.action)}>{ACTION_LABELS[log.action] ?? log.action}</Badge>
                      {detail && <p className="mt-1 text-sm text-ink-700">{detail}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableCard>
    </div>
  );
}
