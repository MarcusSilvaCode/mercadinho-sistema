import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { api, getApiErrorMessage } from "../../lib/api";
import type { Category } from "../../lib/types";

interface CategoryFormModalProps {
  category?: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryFormModal({ category, onClose, onSaved }: CategoryFormModalProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(category);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEditing && category) {
        await api.patch(`/categories/${category.id}`, { name });
      } else {
        await api.post("/categories", { name });
      }
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">
            {isEditing ? "Editar categoria" : "Nova categoria"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 hover:bg-surface-muted hover:text-ink-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="cat-name" className="mb-1.5 block text-sm font-medium text-ink-700">
            Nome
          </label>
          <input
            id="cat-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4 w-full rounded-[10px] border border-surface-border px-3 h-11 text-[15px] outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 bg-surface placeholder:text-ink-300"
            placeholder="Ex: Mercearia"
          />

          {error && (
            <div className="mb-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] border border-surface-border px-4 h-11 text-sm font-semibold text-ink-900 transition hover:bg-brand-50 hover:border-brand-200 bg-surface"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || name.trim().length < 2}
              className="inline-flex items-center justify-center gap-2 flex-1 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
