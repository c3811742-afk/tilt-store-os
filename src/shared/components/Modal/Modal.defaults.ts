import { vars } from '@/shared/theme';
import type { ModalProps } from './Modal.types';

export const modalDefaults: Required<Pick<ModalProps, 'open' | 'width'>> = {
  open: false,
  width: vars.sizes.modal.width,
};
