import { withDefaults } from '@/shared/utils';
import { InfoTip } from '../InfoTip';
import { checkboxDefaults } from './Checkbox.defaults';
import type { CheckboxProps } from './Checkbox.types';
import styles from './Checkbox.module.css';

// A labelled checkbox, for on/off settings and picking several items.
export const Checkbox = (props: CheckboxProps) => {
  const { label, checked, onChange, hint, disabled } = withDefaults(checkboxDefaults, props);
  return (
    <span className={styles.row}>
      <label className={styles.checkbox}>
        <input type="checkbox" className={styles.input} checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} />
        <span className={styles.text}>{label}</span>
      </label>
      {typeof hint === 'string' ? <InfoTip text={hint} /> : hint && <span className={styles.hint}>{hint}</span>}
    </span>
  );
};
