import { Checkbox, Grid, Stack, TextField } from '@/shared/components';
import { useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { ConfigListEditor, SettingsSection } from '../../components';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

const toNumber = (value: string) => (value.trim() === '' ? 0 : Number(value));

// Discount limits per role, discounts on top of promotions, the staff discount, and the reasons staff choose from.
export const DiscountPolicies = () => {
  const { text } = useLocale();
  const { settings } = useReference();
  const t = text.owner.policies;
  const draft = useSettingsDraft(['discountLimits', 'manualDiscountOnPromotion', 'staffDiscount', 'defaultMinMargin']);
  const { values, set } = draft;
  return (
    <Stack gap={vars.spacing[4]}>
      <SettingsSection title={t.discountLimits} hint={t.discountLimitsHint} draft={draft}>
        <Grid minColumnWidth={vars.sizes.field.narrow}>
          <TextField label={t.cashierLimit} type="number" min={0} max={100} suffix={text.common.percentSuffix} value={String(values.discountLimits.cashier)} onChange={(value) => set('discountLimits', { ...values.discountLimits, cashier: toNumber(value) })} />
          <TextField label={t.managerLimit} type="number" min={0} max={100} suffix={text.common.percentSuffix} value={String(values.discountLimits.manager)} onChange={(value) => set('discountLimits', { ...values.discountLimits, manager: toNumber(value) })} />
          <TextField label={t.staffDiscount} hint={t.staffDiscountHint} type="number" min={0} max={100} suffix={text.common.percentSuffix} value={String(values.staffDiscount.percent)} onChange={(value) => set('staffDiscount', { ...values.staffDiscount, percent: toNumber(value) })} />
          <TextField label={t.staffLimit} type="number" min={0} prefix={settings.baseCurrency} value={String(values.staffDiscount.monthlyLimit)} onChange={(value) => set('staffDiscount', { ...values.staffDiscount, monthlyLimit: toNumber(value) })} />
          <TextField label={t.defaultMargin} hint={t.defaultMarginHint} type="number" min={0} max={100} suffix={text.common.percentSuffix} value={String(values.defaultMinMargin)} onChange={(value) => set('defaultMinMargin', toNumber(value))} />
        </Grid>
        <Checkbox label={t.manualOnPromotion} hint={t.manualOnPromotionHint} checked={values.manualDiscountOnPromotion} onChange={(checked) => set('manualDiscountOnPromotion', checked)} />
      </SettingsSection>
      <ConfigListEditor listKey="discountReasons" title={t.discountReasons} hint={t.discountReasonsHint} />
    </Stack>
  );
};
