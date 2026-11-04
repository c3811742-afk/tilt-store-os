import { vars } from '@/shared/theme';
import type { StateMessageProps } from './StateMessage.types';

export const stateMessageDefaults: Required<Pick<StateMessageProps, 'role' | 'minHeight' | 'maxWidth'>> = {
  role: 'status',
  minHeight: vars.sizes.stateMessage.minHeight,
  maxWidth: vars.sizes.stateMessage.maxWidth,
};
