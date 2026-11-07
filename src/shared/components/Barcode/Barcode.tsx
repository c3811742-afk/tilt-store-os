import type { CSSProperties } from 'react';
import { code128Bars, ean13Bars, withDefaults } from '@/shared/utils';
import { barcodeDefaults } from './Barcode.defaults';
import type { BarcodeProps } from './Barcode.types';
import styles from './Barcode.module.css';

// A scannable barcode drawn as SVG bars, with its value under it.
export const Barcode = (props: BarcodeProps) => {
  const { value, format, height, maxWidth, showValue } = withDefaults(barcodeDefaults, props);
  const bars = format === 'ean13' ? ean13Bars(value) : code128Bars(value);
  if (!bars) return null;
  const quiet = 10; // blank modules on each side, so scanners find the edges
  const width = bars.length + quiet * 2;
  return (
    <figure className={styles.barcode} style={{ '--barcode-height': height, '--barcode-max-width': maxWidth } as CSSProperties}>
      <svg className={styles.bars} viewBox={`0 0 ${width} 40`} preserveAspectRatio="none" role="img" aria-label={value}>
        {[...bars].map((bar, index) => (bar === '1' ? <rect key={index} x={index + quiet} y={0} width={1} height={40} /> : null))}
      </svg>
      {showValue && <figcaption className={styles.value}>{value}</figcaption>}
    </figure>
  );
};
