import type { ReactNode } from 'react';
import type { StaffTransferView } from '@/shared/api';

export interface TransferCardsProps {
  views?: StaffTransferView[];
  pathFor?: (transferId: string) => string; // each card links to this page
  empty?: ReactNode; // shown when there are none
}
