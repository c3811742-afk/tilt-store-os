import { cx, withDefaults } from '@/shared/utils';
import { segmentedControlDefaults } from './SegmentedControl.defaults';
import type { SegmentedControlProps } from './SegmentedControl.types';
import styles from './SegmentedControl.module.css';

// A few options side by side, one selected: Today / This week / This month.
export const SegmentedControl = <T extends string>(props: SegmentedControlProps<T>) => {
  const resolved = withDefaults(segmentedControlDefaults, props);
  const options = resolved.options as { value: T; label: string }[];
  return (
    <div className={styles.group} role="group" aria-label={resolved.label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === resolved.value}
          className={cx(styles.option, option.value === resolved.value && styles.selected)}
          onClick={() => resolved.onChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
