import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import type { ImportCommitResult, ImportPreviewResult } from "../lib/types";

async function downloadFile(url: string, filename: string) {
  const response = await api.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export function ProductImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreview(null);
    setCommitResult(null);
    setError(null);
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<ImportPreviewResult>("/import-export/products/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    const validRows = preview.rows.filter((r) => r.errors.length === 0 && r.data).map((r) => r.data!);
    if (validRows.length === 0) return;

    setError(null);
    setCommitting(true);
    try {
      const { data } = await api.post<ImportCommitResult>("/import-export/products/commit", { rows: validRows });
      setCommitResult(data);
      setPreview(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCommitting(false);
    }
  }

  function resetImport() {
    setFileName(null);
    setPreview(null);
    setCommitResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-ink-900">Importar / Exportar produtos</h1>
        <p className="text-sm text-ink-500">Cadastre produtos em massa a partir de uma planilha, ou exporte o catálogo atual.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => downloadFile("/import-export/products/template", "modelo-importacao-produtos.xlsx")}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
        >
          <Download size={15} /> Baixar modelo (.xlsx)
        </button>
        <button
          onClick={() => downloadFile("/import-export/products/export", "produtos.xlsx")}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-surface-muted"
        >
          <FileSpreadsheet size={15} /> Exportar produtos (.xlsx)
        </button>
      </div>

      {!preview && !commitResult && (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface p-8 text-center">
          <Upload className="mx-auto mb-3 text-ink-300" size={28} />
          <p className="mb-1 text-sm font-medium text-ink-900">Envie uma planilha .xlsx ou .csv</p>
          <p className="mb-4 text-xs text-ink-500">
            Use o modelo acima para garantir que as colunas estejam nos nomes certos.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileSelected}
            className="mx-auto block text-sm"
          />
          {fileName && analyzing && <p className="mt-3 text-sm text-ink-500">Analisando {fileName}...</p>}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-500">{error}</div>
      )}

      {preview && (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-4 rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
            <Summary label="Total" value={preview.summary.total} />
            <Summary label="Válidas" value={preview.summary.valid} tone="brand" />
            <Summary label="Com erro" value={preview.summary.invalid} tone={preview.summary.invalid > 0 ? "danger" : undefined} />
            <div className="ml-auto flex gap-2">
              <button
                onClick={resetImport}
                className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink-700 hover:bg-surface-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleCommit}
                disabled={committing || preview.summary.valid === 0}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {committing ? "Importando..." : `Confirmar importação (${preview.summary.valid})`}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
            <div className="overflow-x-auto">
        <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Linha</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Código de barras</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-2.5 text-ink-500">{row.rowNumber}</td>
                    <td className="px-4 py-2.5 text-ink-900">{row.data?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 font-money text-ink-500">{row.data?.barcode ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      {row.errors.length === 0 ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-brand-600">
                          <CheckCircle2 size={13} /> Válida
                        </span>
                      ) : (
                        <span className="flex items-start gap-1 text-xs text-danger-500">
                          <AlertCircle size={13} className="mt-0.5 shrink-0" />
                          {row.errors.join(" ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
          </div>
        </div>
      )}

      {commitResult && (
        <div className="mt-6 rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
          <h2 className="mb-2 text-base font-semibold text-ink-900">Importação concluída</h2>
          <p className="mb-4 text-sm text-ink-500">
            <span className="font-semibold text-brand-600">{commitResult.created}</span> produto(s) criado(s)
            {commitResult.skipped > 0 && (
              <>
                {" "}
                · <span className="font-semibold text-danger-500">{commitResult.skipped}</span> ignorado(s) por erro
              </>
            )}
          </p>

          {commitResult.results.some((r) => r.status === "error") && (
            <ul className="mb-4 space-y-1 text-sm text-danger-500">
              {commitResult.results
                .filter((r) => r.status === "error")
                .map((r) => (
                  <li key={r.rowIndex}>
                    {r.name}: {r.error}
                  </li>
                ))}
            </ul>
          )}

          <button
            onClick={resetImport}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Nova importação
          </button>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: "brand" | "danger" }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p
        className={`font-money text-lg font-semibold ${
          tone === "brand" ? "text-brand-600" : tone === "danger" ? "text-danger-500" : "text-ink-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
