import { vars } from '@/shared/theme';
import type { ContainerProps } from './Container.types';

export const containerDefaults: Required<Pick<ContainerProps, 'as' | 'maxWidth' | 'paddingX'>> = {
  as: 'div',
  maxWidth: vars.sizes.container.maxWidth,
  paddingX: vars.sizes.container.paddingX,
};
