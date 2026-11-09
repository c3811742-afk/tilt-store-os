import { useLocale } from '@/shared/hooks';
import type { PeriodPreset } from '@/shared/utils';
import { withDefaults } from '@/shared/utils';
import { SelectField } from '../SelectField';
import { TextField } from '../TextField';
import { periodFilterDefaults } from './PeriodFilter.defaults';
import type { PeriodFilterProps } from './PeriodFilter.types';
import styles from './PeriodFilter.module.css';

// The date range of a report or dashboard, as a dropdown (Today, This week, ..., Custom); Custom shows From and To.
export const PeriodFilter = (props: PeriodFilterProps) => {
  const { period, presets, width } = withDefaults(periodFilterDefaults, props);
  const { text } = useLocale();
  return (
    <div className={styles.filter}>
      <SelectField<PeriodPreset> label={text.owner.period.label} options={presets.map((value) => ({ value, label: text.owner.period.presets[value] }))} value={period.preset} onChange={period.setPreset} width={width} />
      {period.preset === 'custom' && (
        <>
          <TextField type="date" label={text.common.from} value={period.range.from} onChange={period.setFrom} width={width} />
          <TextField type="date" label={text.common.to} value={period.range.to} min={period.range.from} onChange={period.setTo} width={width} />
        </>
      )}
    </div>
  );
};
