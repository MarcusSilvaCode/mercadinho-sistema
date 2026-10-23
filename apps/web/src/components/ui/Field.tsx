import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, forwardRef, useId } from "react";

export const inputClass =
  "h-11 w-full rounded-[10px] border border-surface-border bg-surface px-3 text-[15px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-surface-muted";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
  /** Recebe o id gerado para ligar <label> ao controle. */
  children: (id: string) => ReactNode;
}

export function Field({ label, hint, error, className = "", children }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger-500">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref,
) {
  return <input ref={ref} className={`${inputClass} ${className}`} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={`${inputClass} cursor-pointer pr-8 ${className}`} {...props}>
      {children}
    </select>
  );
});

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-[10px] bg-danger-50 px-3 py-2.5 text-sm font-medium text-danger-500">
      {children}
    </div>
  );
}
