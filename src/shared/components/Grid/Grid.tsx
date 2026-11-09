import type { CSSProperties } from 'react';
import { cx, withDefaults } from '@/shared/utils';
import { gridDefaults } from './Grid.defaults';
import type { GridProps } from './Grid.types';
import styles from './Grid.module.css';

// Responsive columns: as many as fit, each at least `minColumnWidth` wide (fewer items than fit stretch to fill the
// row), or with `columns` a fixed number of equal columns, as dashboards lay out their figures and cards.
export const Grid = (props: GridProps) => {
  const { children, minColumnWidth, gap, as: Element, columns, alignItems } = withDefaults(gridDefaults, props);
  const style = { '--grid-min-column': minColumnWidth, '--grid-gap': gap, '--grid-columns': columns, '--grid-align': alignItems } as CSSProperties;
  return (
    <Element className={cx(styles.grid, Boolean(columns) && styles.fixed)} style={style}>
      {children}
    </Element>
  );
};
