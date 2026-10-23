import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/** Janela modal padrão: fecha com Esc ou clique fora, foca o primeiro campo ao abrir. */
export function Modal({ title, description, onClose, children, size = "md" }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    // Só foca algo se nenhum campo pediu autoFocus
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button[type=submit]")?.focus();
    }
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[92vh] w-full ${widths[size]} overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-ink-900">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-surface-muted hover:text-ink-700"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Rodapé padrão: Cancelar + ação principal. */
export function ModalActions({
  onCancel,
  submitLabel,
  submitting,
  disabled,
  tone = "primary",
}: {
  onCancel: () => void;
  submitLabel: string;
  submitting?: boolean;
  disabled?: boolean;
  tone?: "primary" | "danger";
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" variant={tone} disabled={submitting || disabled}>
        {submitting ? "Salvando..." : submitLabel}
      </Button>
    </div>
  );
}

/** Substitui window.confirm: mesma linguagem visual do sistema. */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  tone = "primary",
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await onConfirm();
        }}
      >
        <div className="text-[15px] leading-relaxed text-ink-700">{message}</div>
        <ModalActions onCancel={onClose} submitLabel={confirmLabel} tone={tone} />
      </form>
    </Modal>
  );
}
