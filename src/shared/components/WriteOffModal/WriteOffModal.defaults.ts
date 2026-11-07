import type { WriteOffModalProps } from './WriteOffModal.types';

export const writeOffModalDefaults: Required<Pick<WriteOffModalProps, 'open' | 'kind'>> = {
  open: false,
  kind: 'lost',
};
