import type { CSSProperties } from 'react';
import { cx, withDefaults } from '@/shared/utils';
import { detailListDefaults } from './DetailList.defaults';
import type { DetailListProps } from './DetailList.types';
import styles from './DetailList.module.css';

// Label / value pairs: a brand's contact details, a batch's costs, or (rows) a money breakdown.
export const DetailList = (props: DetailListProps) => {
  const { items, minColumnWidth, layout } = withDefaults(detailListDefaults, props);
  return (
    <dl className={cx(styles.list, layout === 'rows' && styles.rows)} style={{ '--detail-list-min': minColumnWidth } as CSSProperties}>
      {items.map((item) => (
        <div key={item.key} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};
