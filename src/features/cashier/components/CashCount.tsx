import { TextField } from '@/shared/components';
import { tillDefaults } from '@/shared/constants';
import { useFormat, useLocale } from '@/shared/hooks';
import { countTotal } from '../utils/cash';
import styles from './cash.module.css';

interface CashCountProps {
  currency: string;
  value: Record<string, number>; // note or coin value -> how many
  onChange: (value: Record<string, number>) => void;
}

// Counting the drawer: how many of each note and coin, and the total.
export const CashCount = ({ currency, value, onChange }: CashCountProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const denominations = tillDefaults.denominations[currency] ?? [];
  return (
    <div className={styles.count}>
      <div className={styles.denominations}>
        {denominations.map((denomination) => (
          <TextField
            key={denomination}
            label={format.money(denomination, currency)}
            type="number"
            inputMode="numeric"
            min={0}
            value={value[denomination] ? String(value[denomination]) : ''}
            placeholder="0"
            onChange={(next) => onChange({ ...value, [denomination]: Math.max(0, Math.floor(Number(next) || 0)) })}
          />
        ))}
      </div>
      <div className={styles.countTotal}>
        <span>{text.cashier.shift.countedTotal}</span>
        <strong>{format.money(countTotal(value), currency)}</strong>
      </div>
    </div>
  );
};
