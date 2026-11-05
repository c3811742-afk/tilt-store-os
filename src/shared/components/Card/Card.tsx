import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { cx, withDefaults } from '@/shared/utils';
import { Text } from '../Text';
import { cardDefaults } from './Card.defaults';
import type { CardProps } from './Card.types';
import styles from './Card.module.css';

// A bordered, flat box for grouped content. With `title` and `actions` it is a page section.
export const Card = (props: CardProps) => {
  const { children, title, actions, as: Element, to, padding, gap, background, borderColor, accentColor, radius } = withDefaults(cardDefaults, props);
  const style = {
    '--card-padding': padding,
    '--card-gap': gap,
    '--card-background': background,
    '--card-border-color': borderColor,
    '--card-accent': accentColor,
    '--card-radius': radius,
  } as CSSProperties;
  const className = cx(styles.card, accentColor && styles.accent);
  const header = (title || actions) && (
    <div className={styles.header}>
      {title && (
        <Text as="h2" variant="h4">
          {title}
        </Text>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={cx(className, styles.link)} style={style}>
        {header}
        {children}
      </Link>
    );
  }
  return (
    <Element className={className} style={style}>
      {header}
      {children}
    </Element>
  );
};
