import type { PeriodPreset } from '@/shared/utils';

export const periodFilterDefaults: { presets: PeriodPreset[] } = {
  presets: ['today', 'week', 'month', 'last30', 'last90', 'custom'],
};
