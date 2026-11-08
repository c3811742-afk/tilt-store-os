import { useLocale } from '@/shared/hooks';
import { cx, withDefaults } from '@/shared/utils';
import { Icon } from '../Icon';
import { pinPadDefaults } from './PinPad.defaults';
import type { PinPadProps } from './PinPad.types';
import styles from './PinPad.module.css';

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// A PIN entry for touch screens: dots for the digits entered and a number keypad. The keyboard works too.
export const PinPad = (props: PinPadProps) => {
  const p = withDefaults(pinPadDefaults, props);
  const { text } = useLocale();

  const press = (digit: string) => {
    if (p.disabled || p.value.length >= p.length) return;
    const next = p.value + digit;
    p.onChange?.(next);
    if (next.length === p.length) p.onComplete?.(next);
  };
  const erase = () => !p.disabled && p.onChange?.(p.value.slice(0, -1));

  return (
    <div
      className={styles.pad}
      role="group"
      aria-label={p.label}
      tabIndex={0}
      onKeyDown={(event) => {
        if (/^[0-9]$/.test(event.key)) press(event.key);
        if (event.key === 'Backspace') erase();
      }}
    >
      <div className={cx(styles.dots, p.error && styles.invalid)} aria-live="polite" aria-label={`${p.value.length} / ${p.length}`}>
        {Array.from({ length: p.length }, (_, index) => (
          <span key={index} className={cx(styles.dot, index < p.value.length && styles.filled)} />
        ))}
      </div>
      {p.error && (
        <p className={styles.error} role="alert">
          {p.error}
        </p>
      )}
      <div className={styles.keys}>
        {digits.map((digit) => (
          <button key={digit} type="button" className={styles.key} disabled={p.disabled} onClick={() => press(digit)}>
            {digit}
          </button>
        ))}
        <span />
        <button type="button" className={styles.key} disabled={p.disabled} onClick={() => press('0')}>
          0
        </button>
        <button type="button" className={cx(styles.key, styles.erase)} disabled={p.disabled || !p.value} onClick={erase} aria-label={text.common.remove}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
};
