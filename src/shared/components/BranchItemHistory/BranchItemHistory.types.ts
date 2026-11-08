import type { ReactNode } from 'react';
import type { BranchItemHistoryData } from '@/shared/api';

export interface BranchItemHistoryProps {
  variantId: string;
  back?: { to: string; label: string }; // the list the page belongs to
  actions?: (data: BranchItemHistoryData) => ReactNode; // e.g. the storekeeper's status and move buttons
  notice?: ReactNode; // shown under the page header, e.g. what an action just did
}
