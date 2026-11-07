import type { StartCountModalProps } from './StartCountModal.types';

export const startCountModalDefaults: Required<Pick<StartCountModalProps, 'open' | 'allowBlind'>> = {
  open: false,
  allowBlind: false,
};
