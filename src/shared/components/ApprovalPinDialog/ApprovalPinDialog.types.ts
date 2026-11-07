import type { ReactNode } from 'react';

export interface ApprovalPinDialogProps {
  open?: boolean;
  approvalId: string; // the request waiting at the till
  branchId: string; // its branch: only this branch's managers are offered
  summary?: ReactNode; // what is being approved
  onClose?: () => void;
  onApproved?: () => void; // the till carries on with the sale
}
