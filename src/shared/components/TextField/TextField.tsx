import { useId } from 'react';
import { cx, withDefaults } from '@/shared/utils';
import { Field } from '../Field';
import controls from '../Field/controls.module.css';
import { textFieldDefaults } from './TextField.defaults';
import type { TextFieldProps } from './TextField.types';

// A labelled input: text, number, date, email, phone or password.
export const TextField = (props: TextFieldProps) => {
  const p = withDefaults(textFieldDefaults, props);
  const id = useId();
  const input = (
    <input
      id={id}
      className={cx(controls.control, p.error && controls.invalid)}
      type={p.type}
      value={p.value}
      onChange={(event) => p.onChange?.(event.target.value)}
      onBlur={p.onBlur}
      placeholder={p.placeholder}
      required={p.required}
      disabled={p.disabled}
      min={p.min}
      max={p.max}
      step={p.step}
      autoComplete={p.autoComplete}
      autoFocus={p.autoFocus}
      inputMode={p.inputMode}
      maxLength={p.maxLength}
      aria-invalid={Boolean(p.error)}
      aria-describedby={p.error || p.hint ? `${id}-message` : undefined}
    />
  );
  return (
    <Field id={id} label={p.label} hint={p.hint} error={p.error} required={p.required} width={p.width}>
      {p.prefix || p.suffix ? (
        <div className={cx(controls.withAffix, p.prefix && controls.hasPrefix, p.suffix && controls.hasSuffix)}>
          {p.prefix && <span className={controls.affix}>{p.prefix}</span>}
          {input}
          {p.suffix && <span className={cx(controls.affix, controls.affixEnd)}>{p.suffix}</span>}
        </div>
      ) : (
        input
      )}
    </Field>
  );
};
