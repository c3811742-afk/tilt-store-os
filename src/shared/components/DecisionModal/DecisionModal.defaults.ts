import type { DecisionModalProps } from './DecisionModal.types';

export const decisionModalDefaults: Required<Pick<DecisionModalProps, 'open' | 'decision' | 'reasons'>> = {
  open: false,
  decision: 'approve',
  reasons: 'approvalReasons',
};
