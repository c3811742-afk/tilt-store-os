import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { gridDefaults } from './Grid.defaults';
import type { GridProps } from './Grid.types';
import styles from './Grid.module.css';

// Responsive columns: as many as fit, each at least `minColumnWidth` wide. Fewer items than fit stretch to fill
// the row, so two cards side by side take the whole width.
export const Grid = (props: GridProps) => {
  const { children, minColumnWidth, gap, as: Element } = withDefaults(gridDefaults, props);
  const style = { '--grid-min-column': minColumnWidth, '--grid-gap': gap } as CSSProperties;
  return (
    <Element className={styles.grid} style={style}>
      {children}
    </Element>
  );
};
