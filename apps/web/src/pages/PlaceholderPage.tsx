interface PlaceholderPageProps {
  title: string;
  phase: string;
}

export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border text-center">
      <h1 className="mb-1 text-lg font-semibold text-ink-900">{title}</h1>
      <p className="text-sm text-ink-500">Este módulo será implementado na {phase}.</p>
    </div>
  );
}
