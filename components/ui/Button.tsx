import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "quiet" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-moss text-paper hover:bg-moss-deep disabled:bg-sage",
  quiet: "bg-transparent text-ink ring-1 ring-inset ring-mist hover:bg-paper-deep disabled:text-sage",
  danger: "bg-transparent text-rust ring-1 ring-inset ring-rust/40 hover:bg-rust/5 disabled:text-sage",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-[0.95rem] font-bold transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  );
}
