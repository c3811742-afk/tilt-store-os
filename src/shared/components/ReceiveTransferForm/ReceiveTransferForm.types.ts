import type { StaffTransferView } from '@/shared/api';

export interface ReceiveTransferFormProps {
  view: StaffTransferView;
  onDone?: () => void; // after the receipt is saved
}
