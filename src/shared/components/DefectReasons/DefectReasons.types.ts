import type { ReactNode } from 'react';
import type { DefectReasonQty } from '@/shared/types';

export interface DefectReasonsProps {
  total: number; // the defective pieces to give a reason to
  value?: DefectReasonQty[]; // empty or one row: every piece has the same reason
  onChange?: (value: DefectReasonQty[]) => void;
  label?: ReactNode; // above the first reason; "Defect reason" when not given
  error?: string; // shown under the reasons, e.g. after a submit with pieces left without a reason
  required?: boolean;
  disabled?: boolean;
}
