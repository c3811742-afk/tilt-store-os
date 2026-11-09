import { vars } from '@/shared/theme';
import type { TabsProps } from './Tabs.types';

export const tabsDefaults: Required<Pick<TabsProps, 'tabs' | 'panelGap'>> = {
  tabs: [],
  panelGap: vars.spacing[4],
};
