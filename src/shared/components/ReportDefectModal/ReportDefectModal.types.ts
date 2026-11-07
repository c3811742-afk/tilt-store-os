import type { VariantHit } from '@/shared/api';
import type { DefectFoundAt } from '@/shared/types';

export interface ReportDefectModalProps {
  open?: boolean;
  onClose?: () => void;
  onDone?: () => void; // after the defect is saved
  initialItem?: VariantHit; // e.g. reported from an item's page
  foundAtOptions?: DefectFoundAt[]; // where it can have been found; the first is the default
  showLiability?: boolean; // ask who carries the cost (storekeepers)
  showPhotos?: boolean; // allow photos of the defect (storekeepers)
  maxPhotos?: number;
}
