import type { ReactNode } from 'react';
import type { IconName } from '@/shared/assets';
import type { Text } from '@/shared/constants';
import type { MenuItem } from '../Menu';

export interface NavItem {
  key: keyof Omit<Text['nav'], 'groups'>;
  to: string;
  icon: IconName;
  end?: boolean; // active only on this exact path (a role's start page)
}

export interface NavGroup {
  key: keyof Text['nav']['groups'];
  items: NavItem[];
}

export interface AppLayoutProps {
  nav?: NavGroup[]; // the side menu, in order
  notificationsPath?: string; // where the bell's "View all" goes
  topStart?: ReactNode; // shown at the start of the top bar (e.g. the branch and the search)
  banner?: ReactNode; // a full-width line under the top bar (e.g. "You're offline")
  accountItems?: MenuItem[]; // extra items in the account menu, above "Log out"
  onSignOut?: () => void;
  children?: ReactNode; // the page; when not set, the matched child route is shown
}
