import type { CSSProperties } from 'react';
import { useLocale } from '@/shared/hooks';
import { withDefaults } from '@/shared/utils';
import { InfoTip } from '../InfoTip';
import { fieldDefaults } from './Field.defaults';
import type { FieldProps } from './Field.types';
import styles from './Field.module.css';

// Label, control and message: the frame of every form field (TextField, SelectField...).
export const Field = (props: FieldProps) => {
  const { label, hint, note, optional, error, required, id, width, children } = withDefaults(fieldDefaults, props);
  const { text } = useLocale();
  const tip = Boolean(label) && typeof hint === 'string';
  const message = note ?? (tip ? undefined : hint);
  return (
    <div className={styles.field} style={{ '--field-width': width } as CSSProperties}>
      {label && (
        <span className={styles.labelRow}>
          <label className={styles.label} htmlFor={id}>
            {label}
            {required && ' *'}
          </label>
          {optional && <span className={styles.optional}>{text.common.optional}</span>}
          {tip && <InfoTip text={hint as string} />}
        </span>
      )}
      {children}
      {error ? (
        <span className={styles.error} id={id ? `${id}-message` : undefined} role="alert">
          {error}
        </span>
      ) : (
        message && (
          <span className={styles.hint} id={id ? `${id}-message` : undefined}>
            {message}
          </span>
        )
      )}
    </div>
  );
};
