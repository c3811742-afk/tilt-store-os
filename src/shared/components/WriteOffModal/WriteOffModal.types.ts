import type { VariantHit } from '@/shared/api';
import type { WriteOff } from '@/shared/types';

export interface WriteOffModalProps {
  open?: boolean;
  onClose?: () => void;
  onDone?: () => void; // after the request is sent
  initialItem?: VariantHit;
  kind?: WriteOff['kind']; // lost (default) or defective
}
