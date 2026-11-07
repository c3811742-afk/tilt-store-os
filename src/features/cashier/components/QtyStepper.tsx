import { IconButton } from '@/shared/components';
import { useFormat, useLocale } from '@/shared/hooks';
import styles from './counter.module.css';

interface QtyStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}

// One less, the quantity, one more. Never below `min` or above what is in stock.
export const QtyStepper = ({ value, min = 1, max, onChange }: QtyStepperProps) => {
  const { text } = useLocale();
  const format = useFormat();
  return (
    <span className={styles.stepper}>
      <IconButton icon="minus" label={text.cashier.cart.decrease} disabled={value <= min} onClick={() => onChange(value - 1)} />
      <span className={styles.stepperValue} aria-label={text.cashier.cart.qty}>
        {format.number(value)}
      </span>
      <IconButton icon="plus" label={text.cashier.cart.increase} disabled={value >= max} onClick={() => onChange(value + 1)} />
    </span>
  );
};
