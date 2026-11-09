import type { DecisionModalProps } from './DecisionModal.types';

export const decisionModalDefaults: Required<Pick<DecisionModalProps, 'open' | 'decision'>> = {
  open: false,
  decision: 'approve',
};
