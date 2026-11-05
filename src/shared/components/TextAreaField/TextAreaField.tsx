import { useId } from 'react';
import { cx, withDefaults } from '@/shared/utils';
import { Field } from '../Field';
import controls from '../Field/controls.module.css';
import { textAreaFieldDefaults } from './TextAreaField.defaults';
import type { TextAreaFieldProps } from './TextAreaField.types';

// A labelled multi-line text box: notes, receipt footers, reasons.
export const TextAreaField = (props: TextAreaFieldProps) => {
  const p = withDefaults(textAreaFieldDefaults, props);
  const id = useId();
  return (
    <Field id={id} label={p.label} hint={p.hint} error={p.error} required={p.required} width={p.width}>
      <textarea
        id={id}
        className={cx(controls.control, controls.textarea, p.error && controls.invalid)}
        value={p.value}
        rows={p.rows}
        onChange={(event) => p.onChange?.(event.target.value)}
        placeholder={p.placeholder}
        required={p.required}
        disabled={p.disabled}
        aria-invalid={Boolean(p.error)}
        dir="auto"
      />
    </Field>
  );
};
