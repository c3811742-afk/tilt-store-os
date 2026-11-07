import type { ReactNode } from 'react';
import type { IconName } from '@/shared/assets';
import type { Text } from '@/shared/constants';

export interface AppShellNavItem {
  key: keyof Omit<Text['nav'], 'groups'>; // its label in text.nav
  to: string; // an app path from routes.ts
  icon: IconName;
  end?: boolean; // active only on this exact path (a role's home page)
}

export interface AppShellNavGroup {
  key: keyof Text['nav']['groups']; // its label in text.nav.groups
  items: AppShellNavItem[];
}

export interface AppShellProps {
  nav?: AppShellNavGroup[]; // the side menu, in order
  notificationsTo?: string; // the "View all" link under the bell; no bell without it
  topStart?: ReactNode; // shown at the start of the top bar (e.g. a branch picker)
}
