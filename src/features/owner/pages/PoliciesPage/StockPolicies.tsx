import { Grid, Stack, TextField } from '@/shared/components';
import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BrandTermsFields, ConfigListEditor, SettingsSection } from '../../components';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

const toNumber = (value: string) => (value.trim() === '' ? 0 : Number(value));

// Stock limits, aging, the default terms for new brands, and the reasons for defects, write-offs and counts.
export const StockPolicies = () => {
  const { text } = useLocale();
  const t = text.owner.policies;
  const draft = useSettingsDraft(['lowStockDefault', 'slowMoverWeeks', 'agingBuckets', 'feeDueDay']);
  const terms = useSettingsDraft(['defaultBrandTerms']);
  const { values, set } = draft;
  return (
    <Stack gap={vars.spacing[4]}>
      <SettingsSection title={t.stockRules} draft={draft}>
        <Grid minColumnWidth={vars.sizes.field.narrow}>
          <TextField label={t.lowStock} hint={t.lowStockHint} type="number" min={0} value={String(values.lowStockDefault)} onChange={(value) => set('lowStockDefault', toNumber(value))} />
          <TextField label={t.slowMoverWeeks} type="number" min={1} value={String(values.slowMoverWeeks)} onChange={(value) => set('slowMoverWeeks', Math.max(toNumber(value), 1))} />
          <TextField
            label={t.agingBuckets}
            placeholder={t.agingBucketsHint}
            value={values.agingBuckets.join(', ')}
            onChange={(value) => set('agingBuckets', value.split(/[,\s]+/).map(Number).filter((days) => days > 0).sort((a, b) => a - b))}
          />
          <TextField label={t.feeDueDay} type="number" min={1} max={28} value={String(values.feeDueDay)} onChange={(value) => set('feeDueDay', Math.min(Math.max(toNumber(value), 1), 28))} />
        </Grid>
      </SettingsSection>
      <SettingsSection title={t.defaultTerms} hint={t.defaultTermsHint} draft={terms}>
        <BrandTermsFields value={terms.values.defaultBrandTerms} onChange={(value) => terms.set('defaultBrandTerms', value)} />
      </SettingsSection>
      <ConfigListEditor listKey="defectReasons" title={t.defectReasons} />
      <ConfigListEditor listKey="writeOffReasons" title={t.writeOffReasons} />
      <ConfigListEditor listKey="countReasons" title={t.countReasons} />
    </Stack>
  );
};
