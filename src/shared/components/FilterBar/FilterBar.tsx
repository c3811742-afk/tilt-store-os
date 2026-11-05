import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { filterBarDefaults } from './FilterBar.defaults';
import type { FilterBarProps } from './FilterBar.types';
import styles from './FilterBar.module.css';

// A row of filters above a list or report; wraps on small screens.
export const FilterBar = (props: FilterBarProps) => {
  const { children, actions, fieldWidth } = withDefaults(filterBarDefaults, props);
  return (
    <div className={styles.bar}>
      <div className={styles.fields} style={{ '--filter-bar-field': fieldWidth } as CSSProperties}>
        {children}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};
