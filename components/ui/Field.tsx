import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

const control =
  "w-full min-h-11 rounded-md bg-white/70 px-3 text-ink ring-1 ring-inset ring-mist placeholder:text-sage/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss aria-[invalid=true]:ring-rust";

function Wrapper({ id, label, hint, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-rust" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-sage">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ label, hint, error, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={control} {...props} />
    </Wrapper>
  );
}

export function SelectField({ label, hint, error, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error}>
      <select id={id} aria-invalid={!!error} className={control} {...props}>
        {children}
      </select>
    </Wrapper>
  );
}
