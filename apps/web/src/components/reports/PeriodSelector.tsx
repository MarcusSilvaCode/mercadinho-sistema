import type { ReportPeriod, ReportPreset } from "../../lib/types";

interface PeriodSelectorProps {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "ultimos_7_dias", label: "Últimos 7 dias" },
  { value: "este_mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const isCustom = Boolean(value.from && value.to);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Período" className="flex flex-wrap gap-1 rounded-xl border border-surface-border bg-surface p-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-pressed={value.preset === preset.value}
            onClick={() => onChange({ preset: preset.value })}
            className={`h-9 rounded-lg px-3 text-sm font-semibold transition ${
              value.preset === preset.value ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-brand-50"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={value.from ?? ""}
          onChange={(e) => onChange({ from: e.target.value, to: value.to ?? e.target.value })}
          aria-label="Data inicial"
          className={`h-11 rounded-[10px] border bg-surface px-3 text-[15px] text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
            isCustom ? "border-brand-500" : "border-surface-border"
          }`}
        />
        <span className="text-sm text-ink-500">até</span>
        <input
          type="date"
          value={value.to ?? ""}
          onChange={(e) => onChange({ from: value.from ?? e.target.value, to: e.target.value })}
          aria-label="Data final"
          className={`h-11 rounded-[10px] border bg-surface px-3 text-[15px] text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
            isCustom ? "border-brand-500" : "border-surface-border"
          }`}
        />
      </div>
    </div>
  );
}
