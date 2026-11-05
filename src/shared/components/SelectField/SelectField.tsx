import { useId } from 'react';
import { cx, withDefaults } from '@/shared/utils';
import { Field } from '../Field';
import controls from '../Field/controls.module.css';
import { selectFieldDefaults } from './SelectField.defaults';
import type { SelectFieldProps } from './SelectField.types';

// A labelled native select: works with the keyboard, screen readers and phones without extra code.
export const SelectField = <T extends string>(props: SelectFieldProps<T>) => {
  const p = withDefaults(selectFieldDefaults, props);
  const id = useId();
  return (
    <Field id={id} label={p.label} hint={p.hint} error={p.error} required={p.required} width={p.width}>
      <select
        id={id}
        className={cx(controls.control, p.error && controls.invalid)}
        value={p.value ?? ''}
        onChange={(event) => p.onChange?.(event.target.value as T)}
        required={p.required}
        disabled={p.disabled}
        aria-invalid={Boolean(p.error)}
      >
        {p.placeholder !== undefined && <option value="">{p.placeholder}</option>}
        {p.options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
};
