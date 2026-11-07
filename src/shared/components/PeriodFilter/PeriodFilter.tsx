import { useLocale } from '@/shared/hooks';
import { withDefaults } from '@/shared/utils';
import { SegmentedControl } from '../SegmentedControl';
import { TextField } from '../TextField';
import { periodFilterDefaults } from './PeriodFilter.defaults';
import type { PeriodFilterProps } from './PeriodFilter.types';
import styles from './PeriodFilter.module.css';

// Today / This week / This month / ... / Custom dates.
export const PeriodFilter = (props: PeriodFilterProps) => {
  const { period, presets } = withDefaults(periodFilterDefaults, props);
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
