import { vars } from '@/shared/theme';
import type { StatCardProps, Trend } from './StatCard.types';

export const statCardTrendColors: Record<Trend, string> = {
  up: vars.colors.success,
  down: vars.colors.danger,
  flat: vars.colors.textMuted,
};

export const statCardDefaults: Required<Pick<StatCardProps, 'label' | 'value' | 'highlight' | 'minHeight'>> = {
  label: '',
  value: '',
  highlight: false,
  minHeight: vars.sizes.statCard.minHeight,
};
