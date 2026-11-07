import type { StockCount } from '@/shared/types';

export interface StartCountModalProps {
  open?: boolean;
  allowBlind?: boolean; // offer a blind count (branch managers)
  onClose?: () => void;
  onStarted?: (count: StockCount) => void;
}
