import { useRef, useState, type FormEvent } from 'react';
import { safeAsync } from '@/shared/utils';

type Validators<T> = { [K in keyof T]?: (value: T[K], values: T) => string | null };
type FieldErrors<T> = Partial<Record<keyof T, string>>;

// Form state shared by every form: values, validation before submit, a busy flag while the request runs
// (so it can't be sent twice), and the request's error. What the user typed is always kept.
export const useForm = <T extends object>(initialValues: T, validators: Validators<T> = {}) => {
  const [values, setValues] = useState(initialValues);
  const latest = useRef(initialValues);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<unknown>(null);

  const validate = (name: keyof T, current: T) => validators[name]?.(current[name], current) ?? undefined;

  const setValue = <K extends keyof T>(name: K, value: T[K]) => {
    const next = { ...latest.current, [name]: value };
    latest.current = next;
    setValues(next);
    if (errors[name]) setErrors((current) => ({ ...current, [name]: validate(name, next) }));
  };

  const reset = (next: T) => {
    latest.current = next;
    setValues(next);
    setErrors({});
  };

  // Props for a text input bound to a string field: value, onChange and the error message.
  const field = <K extends keyof T>(name: K) => ({
    value: String(values[name] ?? ''),
    onChange: (value: string) => setValue(name, value as T[K]),
    error: errors[name],
  });

  // Returns a submit handler: validates every field, then runs `action`. A thrown error is kept in `requestError`.
  const submit = (action: (values: T) => Promise<unknown>) => async (event?: FormEvent) => {
    event?.preventDefault();
    if (submitting) return false;
    const current = latest.current;
    const nextErrors = Object.fromEntries((Object.keys(validators) as (keyof T)[]).map((name) => [name, validate(name, current)])) as FieldErrors<T>;
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return false;
    setSubmitting(true);
    setRequestError(null);
    const result = await safeAsync(() => action(current));
    setSubmitting(false);
    if (!result.ok) setRequestError(result.error);
    return result.ok;
  };

  return { values, setValue, reset, field, errors, submitting, requestError, submit };
};
