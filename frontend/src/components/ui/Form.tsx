import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

// Label above, control, helper/error below. Never placeholder-as-label.
interface FieldProps {
  label: string;
  helper?: string;
  error?: string;
  icon?: ReactNode;
  children: (id: string, className: string) => ReactNode;
}

const control =
  'w-full bg-surface border border-line rounded-lg px-4 h-11 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-accent aria-[invalid=true]:border-bad';

export function Field({ label, helper, error, children }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-muted mb-2">
        {label}
      </label>
      {children(id, control)}
      {error ? (
        <p className="mt-2 text-sm text-bad">{error}</p>
      ) : helper ? (
        <p className="mt-2 text-sm text-ink-faint">{helper}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string; error?: string };

export function Input({ label, helper, error, className = '', ...rest }: InputProps) {
  return (
    <Field label={label} helper={helper} error={error}>
      {(id, cls) => (
        <input
          id={id}
          aria-invalid={!!error}
          className={`${cls} ${className}`}
          // A wheel scroll over a focused number field would silently change its value.
          onWheel={rest.type === 'number' ? (e) => e.currentTarget.blur() : undefined}
          {...rest}
        />
      )}
    </Field>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; helper?: string; error?: string };

export function Select({ label, helper, error, children, className = '', ...rest }: SelectProps) {
  return (
    <Field label={label} helper={helper} error={error}>
      {(id, cls) => (
        <select id={id} aria-invalid={!!error} className={`${cls} ${className}`} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function PasswordInput({ label, helper, error, ...rest }: InputProps) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} helper={helper} error={error}>
      {(id, cls) => (
        <div className="relative">
          <input id={id} aria-invalid={!!error} type={show ? 'text' : 'password'} className={`${cls} pr-12`} {...rest} />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted hover:text-ink"
          >
            {show ? <EyeSlash size={18} /> : <Eye size={18} />}
          </button>
        </div>
      )}
    </Field>
  );
}

// Replaces the three copy-pasted amenity grids and toggleAmenity functions in Admin.
export function CheckboxGrid({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <label
            key={o}
            className={`flex items-center gap-3 rounded-lg border px-4 h-11 cursor-pointer text-sm transition-colors ${
              on ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-muted hover:bg-surface-2'
            }`}
          >
            <input type="checkbox" checked={on} onChange={() => toggle(o)} className="accent-accent h-4 w-4" />
            {o}
          </label>
        );
      })}
    </div>
  );
}
