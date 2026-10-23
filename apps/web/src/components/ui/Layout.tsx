import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Cabeçalho de página: título forte, descrição curta e ações à direita (empilham no celular). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">
          {title}
        </h1>
        {description && <p className="mt-1 text-[15px] text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Bloco de conteúdo com título opcional. Use com moderação: nem tudo precisa de caixa. */
export function Panel({
  title,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-surface-border bg-surface ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-3.5">
          <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
          {action}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-500",
  brand: "bg-brand-50 text-brand-600",
  success: "bg-success-50 text-success-500",
  warning: "bg-amber-50 text-amber-500",
  danger: "bg-danger-50 text-danger-500",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

/** Estado vazio com convite à ação — nunca uma tela "quebrada" sem explicação. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Linhas cinzas pulsando no lugar do texto "Carregando...". */
export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-5 animate-pulse rounded-md bg-surface-muted" style={{ width: `${90 - (i % 3) * 18}%` }} />
      ))}
    </div>
  );
}

/** Faixa de azulejos (marca visual da direção Azulejo). Puramente decorativa. */
export function TileBand({ columns = 6, rows = 2, className = "" }: { columns?: number; rows?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`grid ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns * rows }, (_, i) => {
        const inverted = (Math.floor(i / columns) + i) % 2 === 1;
        return (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center ${inverted ? "bg-white" : "bg-brand-500"}`}
          >
            <div className={`h-[46%] w-[46%] rotate-45 ${inverted ? "bg-brand-500" : "bg-white"}`} />
          </div>
        );
      })}
    </div>
  );
}
