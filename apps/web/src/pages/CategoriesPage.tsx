import { useEffect, useState } from "react";
import { Pencil, Plus, Power } from "lucide-react";
import { api } from "../lib/api";
import type { Category } from "../lib/types";
import { CategoryFormModal } from "../components/categories/CategoryFormModal";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get<{ categories: Category[] }>("/categories", {
      params: { includeInactive: showInactive },
    });
    setCategories(data.categories);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setModalOpen(true);
  }

  async function toggleActive(category: Category) {
    await api.patch(`/categories/${category.id}`, { active: !category.active });
    load();
  }

  function handleSaved() {
    setModalOpen(false);
    load();
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-ink-900 md:text-[32px]">Categorias</h1>
          <p className="mt-1 text-[15px] text-ink-500">Organize os produtos por categoria.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-500 px-4 h-11 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      <label className="mb-4 flex w-fit items-center gap-2 text-sm text-ink-500">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="rounded border-surface-border"
        />
        Mostrar inativas
      </label>

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase tracking-[0.06em] text-ink-500">
              <th className="px-5 py-3.5">Nome</th>
              <th className="px-5 py-3.5">Produtos vinculados</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-500">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-500">
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            )}
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-surface-border last:border-0 transition-colors hover:bg-surface-muted/60">
                <td className="px-5 py-3.5 font-medium text-ink-900">{category.name}</td>
                <td className="px-5 py-3.5 text-ink-500">{category._count?.products ?? 0}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      category.active ? "bg-brand-50 text-brand-600" : "bg-surface-muted text-ink-500"
                    }`}
                  >
                    {category.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(category)}
                      title="Editar"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => toggleActive(category)}
                      title={category.active ? "Inativar" : "Ativar"}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Power size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {modalOpen && (
        <CategoryFormModal
          category={editing}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
