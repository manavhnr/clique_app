import { cn } from '@/lib/utils';
import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, useId } from 'react';

const fieldClasses =
  'w-full bg-well border border-line-2 rounded-[3px] px-4 py-3.5 font-display text-base text-paper placeholder:text-dim transition-colors ' +
  'focus:outline-none focus:border-lime';

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="font-mono text-[11px] uppercase tracking-[.14em] text-dim">
      {children}
    </label>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="font-mono text-xs text-hot">
      {error}
    </p>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-2">
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(fieldClasses, error && 'border-hot focus:border-hot', className)}
        {...props}
      />
      <FieldError id={`${inputId}-error`} error={error} />
    </div>
  );
});
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex flex-col gap-2">
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(fieldClasses, 'resize-none leading-relaxed', error && 'border-hot focus:border-hot', className)}
          {...props}
        />
        <FieldError id={`${inputId}-error`} error={error} />
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex flex-col gap-2">
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <select
          ref={ref}
          id={inputId}
          className={cn(fieldClasses, 'cursor-pointer appearance-none', error && 'border-hot focus:border-hot', className)}
          {...props}
        >
          {children}
        </select>
        <FieldError id={`${inputId}-error`} error={error} />
      </div>
    );
  }
);
Select.displayName = 'Select';

export default Input;
