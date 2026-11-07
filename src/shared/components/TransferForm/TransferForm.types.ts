import type { Transfer } from '@/shared/types';
import type { ItemLine } from '../ItemLinesEditor';

export interface TransferFormProps {
  mode?: 'request' | 'send'; // ask another branch for items, or send items from this branch
  initialLines?: ItemLine[];
  initialOtherBranchId?: string;
  onCreated?: (transfer: Transfer) => void;
  onCancel?: () => void;
}
