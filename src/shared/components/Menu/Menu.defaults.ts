import { vars } from '@/shared/theme';
import type { MenuProps } from './Menu.types';

export const menuDefaults: Required<Pick<MenuProps, 'items' | 'align' | 'minWidth'>> = {
  items: [],
  align: 'end',
  minWidth: vars.sizes.menu.minWidth,
};
