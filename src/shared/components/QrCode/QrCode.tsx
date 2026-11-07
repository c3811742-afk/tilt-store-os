import type { CSSProperties } from 'react';
import { encode } from 'uqr';
import { withDefaults } from '@/shared/utils';
import { qrCodeDefaults } from './QrCode.defaults';
import type { QrCodeProps } from './QrCode.types';
import styles from './QrCode.module.css';

// A QR code drawn as SVG (e.g. the tax QR on Saudi receipts).
export const QrCode = (props: QrCodeProps) => {
  const { value, size, label } = withDefaults(qrCodeDefaults, props);
  if (!value) return null;
  const { data } = encode(value, { ecc: 'M', border: 2 });
  const path = data.flatMap((row, y) => row.flatMap((dark, x) => (dark ? [`M${x} ${y}h1v1h-1z`] : []))).join('');
  return (
    <svg className={styles.qr} style={{ '--qr-size': size } as CSSProperties} viewBox={`0 0 ${data.length} ${data.length}`} role="img" aria-label={label ?? value} shapeRendering="crispEdges">
      <path d={path} />
    </svg>
  );
};
