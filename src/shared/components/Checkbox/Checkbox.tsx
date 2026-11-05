import { withDefaults } from '@/shared/utils';
import { checkboxDefaults } from './Checkbox.defaults';
import type { CheckboxProps } from './Checkbox.types';
import styles from './Checkbox.module.css';

// A labelled checkbox, for on/off settings and picking several items.
export const Checkbox = (props: CheckboxProps) => {
  const { label, checked, onChange, hint, disabled } = withDefaults(checkboxDefaults, props);
  return (
    <label className={styles.checkbox}>
      <input type="checkbox" className={styles.input} checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} />
      <span className={styles.text}>
        {label}
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
    </label>
  );
};
