import { ButtonHTMLAttributes, forwardRef } from "react";
import { Link, LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
  secondary: "border border-surface-border bg-surface text-ink-900 hover:border-brand-200 hover:bg-brand-50",
  ghost: "text-ink-700 hover:bg-surface-muted hover:text-ink-900",
  danger: "bg-danger-500 text-white hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** Botão só com ícone — exige `label` (lido por leitores de tela e exibido como dica). */
export function IconButton({
  label,
  className = "",
  tone = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
        tone === "danger" ? "hover:bg-danger-50 hover:text-danger-500" : "hover:bg-brand-50 hover:text-brand-600"
      } ${className}`}
      {...props}
    />
  );
}
