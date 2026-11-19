import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (ids: { inputId: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Rótulo, ajuda e erro ligados ao campo por aria-describedby. */
export function FieldShell({ label, hint, error, optional, className = "", children }: FieldShellProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> (opcional)</span>}
      </label>
      {children({ inputId, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-bold text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  wrapperClassName?: string;
};

export function TextField({ label, hint, error, optional, value, onChange, suffix, wrapperClassName, className = "", ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={wrapperClassName}>
      {({ inputId, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={`field-control ${suffix ? "pr-14" : ""} ${className}`}
            {...rest}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-bold text-muted">
              {suffix}
            </span>
          )}
        </div>
      )}
    </FieldShell>
  );
}

/** Campo numérico com teclado decimal no celular; aceita vírgula. */
export function NumberField(props: Omit<TextFieldProps, "inputMode" | "type"> & { integer?: boolean }) {
  const { integer, ...rest } = props;
  return <TextField inputMode={integer ? "numeric" : "decimal"} autoComplete="off" enterKeyHint="done" {...rest} />;
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  wrapperClassName?: string;
};

export function SelectField({ label, hint, error, value, onChange, options, wrapperClassName, ...rest }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={wrapperClassName}>
      {({ inputId, describedBy, invalid }) => (
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="field-control appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2220%22%20height=%2220%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%2312303a%22%20stroke-width=%222%22%3E%3Cpath%20d=%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat pr-10"
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export function TextAreaField({ label, hint, error, optional, value, onChange, ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional}>
      {({ inputId, describedBy, invalid }) => (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          rows={3}
          className="field-control min-h-24 resize-y"
          {...rest}
        />
      )}
    </FieldShell>
  );
}
