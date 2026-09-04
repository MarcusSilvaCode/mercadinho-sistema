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
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onChange({ preset: preset.value })}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            value.preset === preset.value
              ? "bg-brand-500 text-white"
              : "border border-surface-border text-ink-700 hover:bg-surface-muted"
          }`}
        >
          {preset.label}
        </button>
      ))}

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={value.from ?? ""}
          onChange={(e) => onChange({ from: e.target.value, to: value.to ?? e.target.value })}
          className={`rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
            isCustom ? "border-brand-500" : "border-surface-border"
          }`}
        />
        <span className="text-sm text-ink-500">até</span>
        <input
          type="date"
          value={value.to ?? ""}
          onChange={(e) => onChange({ from: value.from ?? e.target.value, to: e.target.value })}
          className={`rounded-lg border px-2 py-1.5 text-sm outline-none focus:border-brand-500 ${
            isCustom ? "border-brand-500" : "border-surface-border"
          }`}
        />
      </div>
    </div>
  );
}
