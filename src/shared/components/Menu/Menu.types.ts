import type { ReactNode } from 'react';
import type { IconName } from '@/shared/assets';

export interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: IconName;
  onSelect?: () => void;
  to?: string; // an app path: the item is a link
  danger?: boolean;
  selected?: boolean;
}

export interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode; // the button that opens the menu
  items?: MenuItem[];
  header?: ReactNode; // shown above the items (e.g. the signed-in name)
  align?: 'start' | 'end'; // which edge of the trigger the menu lines up with
  minWidth?: string;
}
