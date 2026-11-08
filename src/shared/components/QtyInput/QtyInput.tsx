import { withDefaults } from '@/shared/utils';
import { TextField } from '../TextField';
import { qtyInputDefaults } from './QtyInput.defaults';
import type { QtyInputProps } from './QtyInput.types';
import styles from './QtyInput.module.css';

// A number of pieces typed in a table cell (receiving, counts, returns, transfers). Put its column's align on 'end'
// and width on vars.sizes.field.qty so the boxes line up under the heading.
export const QtyInput = (props: QtyInputProps) => {
  const p = withDefaults(qtyInputDefaults, props);
  return (
    <div className={styles.qty}>
      <TextField
        label={<span aria-label={p.label} />}
        type="number"
        inputMode="numeric"
        min={p.min}
        max={p.max}
        placeholder={p.placeholder}
        value={p.value}
        onChange={p.onChange}
        disabled={p.disabled}
        width={p.width}
      />
    </div>
  );
};
