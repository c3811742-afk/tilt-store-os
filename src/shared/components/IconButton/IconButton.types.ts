import type { MouseEventHandler } from 'react';
import type { IconName } from '@/shared/assets';

export interface IconButtonProps {
  icon?: IconName;
  label: string; // the accessible name (icon-only buttons have no visible text)
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  size?: string;
  color?: string;
  expanded?: boolean; // for buttons that open a menu
}
