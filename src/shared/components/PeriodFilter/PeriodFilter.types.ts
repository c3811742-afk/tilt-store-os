import type { Period } from '@/shared/hooks';
import type { PeriodPreset } from '@/shared/utils';

export interface PeriodFilterProps {
  period: Period; // from usePeriod()
  presets?: PeriodPreset[]; // the choices shown, in order
}
