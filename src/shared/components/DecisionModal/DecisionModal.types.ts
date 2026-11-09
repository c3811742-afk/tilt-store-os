import type { ReactNode } from 'react';
import type { ConfigListKey } from '@/shared/types';

export interface DecisionInput {
  reasonId: string; // approving: optional, from the approval reasons; rejecting: required, from the rejection reasons
  note?: string;
}

export interface DecisionModalProps {
  open?: boolean;
  decision?: 'approve' | 'reject';
  title?: ReactNode; // defaults to "Approve request" / "Reject request"
  summary?: ReactNode; // what is being decided
  reasons?: ConfigListKey; // which of the owner's reason lists to choose from; by default approval or rejection reasons
  confirmLabel?: string; // the button, when not Approve / Reject (e.g. Void sale)
  onConfirm?: (input: DecisionInput) => Promise<unknown>; // a failure keeps the dialog open with the message
  onClose?: () => void;
}
