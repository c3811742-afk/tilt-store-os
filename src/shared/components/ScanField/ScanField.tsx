import { useId, useState, type KeyboardEvent } from 'react';
import { useLocale } from '@/shared/hooks';
import { withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Field } from '../Field';
import controls from '../Field/controls.module.css';
import { scanFieldDefaults } from './ScanField.defaults';
import type { ScanFieldProps } from './ScanField.types';
import styles from './ScanField.module.css';

// A barcode field. Handheld scanners type the code and press Enter, so it works with any USB or Bluetooth
// scanner, and staff can also type a name or SKU. Not a <form>, so it can sit inside one.
export const ScanField = (props: ScanFieldProps) => {
  const p = withDefaults(scanFieldDefaults, props);
  const { text } = useLocale();
  const id = useId();
  const [value, setValue] = useState('');

  const scan = () => {
    const code = value.trim();
    if (!code) return;
    p.onScan?.(code);
    if (p.clearOnScan) setValue('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault(); // never submits the surrounding form
    scan();
  };

  return (
    <Field id={id} label={p.label ?? text.staff.items.scan} hint={p.hint ?? text.staff.items.scanHint} width={p.width}>
      <div className={styles.row}>
        <input
          id={id}
          className={controls.control}
          type="search"
          inputMode="search"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={p.disabled}
          autoFocus={p.autoFocus}
        />
        <Button variant="secondary" onClick={scan} disabled={p.disabled}>
          {p.buttonLabel ?? text.staff.items.find}
        </Button>
      </div>
    </Field>
  );
};
