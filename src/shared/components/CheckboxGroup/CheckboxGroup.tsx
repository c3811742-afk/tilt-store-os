import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { Checkbox } from '../Checkbox';
import { InfoTip } from '../InfoTip';
import { checkboxGroupDefaults } from './CheckboxGroup.defaults';
import type { CheckboxGroupProps } from './CheckboxGroup.types';
import styles from './CheckboxGroup.module.css';

// Several checkboxes for one choice: the branches a promotion runs in, a role's permissions.
export const CheckboxGroup = <T extends string>(props: CheckboxGroupProps<T>) => {
  const resolved = withDefaults(checkboxGroupDefaults, props);
  const { label, hint, error, minColumnWidth, onChange } = resolved;
  const options = resolved.options as { value: T; label: string }[];
  const value = resolved.value as T[];
  const toggle = (option: T, checked: boolean) =>
    onChange?.(checked ? [...value, option] : value.filter((current) => current !== option));

  return (
    <fieldset className={styles.group}>
      {label && (
        <legend className={styles.legend}>
          {label}
          {typeof hint === 'string' && <InfoTip text={hint} />}
        </legend>
      )}
      <div className={styles.options} style={{ '--checkbox-group-min': minColumnWidth } as CSSProperties}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={value.includes(option.value)}
            onChange={(checked) => toggle(option.value, checked)}
          />
        ))}
      </div>
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        hint && !(label && typeof hint === 'string') && <span className={styles.hint}>{hint}</span>
      )}
    </fieldset>
  );
};
