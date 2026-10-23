import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Cabeçalho de tabela padrão (texto pequeno, discreto: o conteúdo é o protagonista). */
export const theadRowClass =
  "border-b border-surface-border text-left text-xs font-semibold uppercase tracking-[0.06em] text-ink-500";
export const thClass = "px-5 py-3 font-semibold";
export const tdClass = "px-5 py-3.5";
export const trClass = "border-b border-surface-border last:border-0 transition-colors hover:bg-surface-muted/60";

/** Caixa que contém uma tabela (rola na horizontal se preciso, sem estourar a página). */
export function TableCard({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const btn =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-surface-border bg-surface px-3 text-sm font-semibold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center justify-between border-t border-surface-border px-5 py-3 text-sm text-ink-500">
      <span>
        Página <strong className="font-semibold text-ink-900">{page}</strong> de {totalPages}
      </span>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} /> Anterior
        </button>
        <button type="button" className={btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Próxima <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
