import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { withDefaults } from '@/shared/utils';
import { barListDefaults } from './BarList.defaults';
import type { BarListItem, BarListProps } from './BarList.types';
import styles from './BarList.module.css';

const percentOfMax = 100;

// A ranked list with a bar under each row: top products, most profitable brands. Values are always written out.
export const BarList = (props: BarListProps) => {
  const { items, color, label } = withDefaults(barListDefaults, props);
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 0);

  const content = (item: BarListItem) => (
    <>
      <span className={styles.text}>
        <span className={styles.label} dir="auto">
          {item.label}
        </span>
        <span className={styles.value}>
          {item.display} {item.detail && <span className={styles.detail}>{item.detail}</span>}
        </span>
      </span>
      <span className={styles.track} aria-hidden>
        <span className={styles.bar} style={{ inlineSize: `${max ? (Math.abs(item.value) / max) * percentOfMax : 0}%` }} />
      </span>
    </>
  );

  return (
    <ul className={styles.list} style={{ '--bar-list-color': color } as CSSProperties} aria-label={label}>
      {items.map((item) => (
        <li key={item.key}>
          {item.to ? (
            <Link to={item.to} className={styles.row}>
              {content(item)}
            </Link>
          ) : (
            <span className={styles.row}>{content(item)}</span>
          )}
        </li>
      ))}
    </ul>
  );
};
