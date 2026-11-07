import type { ReportDefectModalProps } from './ReportDefectModal.types';

export const reportDefectModalDefaults: Required<Pick<ReportDefectModalProps, 'open' | 'foundAtOptions' | 'showLiability' | 'showPhotos' | 'maxPhotos'>> = {
  open: false,
  foundAtOptions: ['store'],
  showLiability: false,
  showPhotos: false,
  maxPhotos: 3,
};
