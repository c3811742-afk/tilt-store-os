import { SegmentedControl, TextField } from '@/shared/components';
import { useLocale } from '@/shared/hooks';
import type { PeriodPreset } from '@/shared/utils';
import type { Period } from '../../hooks';
import styles from './PeriodFilter.module.css';

export interface PeriodFilterProps {
  period: Period;
  presets?: PeriodPreset[];
}

const defaultPresets: PeriodPreset[] = ['today', 'week', 'month', 'last30', 'last90', 'custom'];

// Today / This week / This month / ... / Custom dates.
export const PeriodFilter = ({ period, presets = defaultPresets }: PeriodFilterProps) => {
  const { text } = useLocale();
  return (
    <div className={styles.filter}>
      <SegmentedControl label={text.owner.period.label} options={presets.map((value) => ({ value, label: text.owner.period.presets[value] }))} value={period.preset} onChange={period.setPreset} />
      {period.preset === 'custom' && (
        <div className={styles.dates}>
          <TextField type="date" label={text.common.from} value={period.range.from} onChange={period.setFrom} />
          <TextField type="date" label={text.common.to} value={period.range.to} min={period.range.from} onChange={period.setTo} />
        </div>
      )}
    </div>
  );
};
