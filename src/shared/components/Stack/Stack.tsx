import type { CSSProperties } from 'react';
import { cx, withDefaults } from '@/shared/utils';
import { stackDefaults } from './Stack.defaults';
import type { StackProps } from './Stack.types';
import styles from './Stack.module.css';

// Lays its children out in a column (or a row) with even spacing. The building block of every page layout.
export const Stack = (props: StackProps) => {
  const { children, as: Element, direction, gap, align, justify, wrap, grow, onSubmit, ariaLabel } = withDefaults(stackDefaults, props);
  const style = {
    '--stack-direction': direction,
    '--stack-gap': gap,
    '--stack-align': align,
    '--stack-justify': justify,
    '--stack-wrap': wrap ? 'wrap' : 'nowrap',
  } as CSSProperties;
  const className = cx(styles.stack, grow && styles.grow);

  if (Element === 'form') {
    return (
      <form className={className} style={style} onSubmit={onSubmit} noValidate aria-label={ariaLabel}>
        {children}
      </form>
    );
  }
  return (
    <Element className={className} style={style} aria-label={ariaLabel}>
      {children}
    </Element>
  );
};
