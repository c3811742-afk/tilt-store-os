import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { containerDefaults } from './Container.defaults';
import type { ContainerProps } from './Container.types';
import styles from './Container.module.css';

// Centers page content and caps its width; full width with side padding on small screens.
export const Container = (props: ContainerProps) => {
  const { children, as: Element, maxWidth, paddingX } = withDefaults(containerDefaults, props);

  const style = {
    '--container-max-width': maxWidth,
    '--container-padding-x': paddingX,
  } as CSSProperties;

  return (
    <Element className={styles.container} style={style}>
      {children}
    </Element>
  );
};
