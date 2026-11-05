import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { fieldDefaults } from './Field.defaults';
import type { FieldProps } from './Field.types';
import styles from './Field.module.css';

// Label, control and message: the frame of every form field (TextField, SelectField...).
export const Field = (props: FieldProps) => {
  const { label, hint, error, required, id, width, children } = withDefaults(fieldDefaults, props);
  return (
    <div className={styles.field} style={{ '--field-width': width } as CSSProperties}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required && ' *'}
        </label>
      )}
      {children}
      {error ? (
        <span className={styles.error} id={id ? `${id}-message` : undefined} role="alert">
          {error}
        </span>
      ) : (
        hint && (
          <span className={styles.hint} id={id ? `${id}-message` : undefined}>
            {hint}
          </span>
        )
      )}
    </div>
  );
};
