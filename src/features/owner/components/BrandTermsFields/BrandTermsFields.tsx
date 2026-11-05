import { Checkbox, Grid, SelectField, TextField } from '@/shared/components';
import { brandModels, defectPolicies, discountFundings, payoutFrequencies } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';
import type { BrandTerms } from '@/shared/types';
import { vars } from '@/shared/theme';
import { CurrencySelect } from '../CurrencySelect';

export interface BrandTermsFieldsProps {
  value: BrandTerms;
  onChange: (value: BrandTerms) => void;
  errors?: Partial<Record<keyof BrandTerms, string>>;
}

// A brand's deal: its model, commission, monthly fee, payouts, discounts and defects.
// Models combine: a commission brand can also pay a monthly fee.
export const BrandTermsFields = ({ value, onChange, errors = {} }: BrandTermsFieldsProps) => {
  const { text } = useLocale();
  const t = text.owner.brands.terms;
  const set = <K extends keyof BrandTerms>(key: K, next: BrandTerms[K]) => onChange({ ...value, [key]: next });
  const own = value.model === 'own';
  const number = (input: string) => (input.trim() === '' ? 0 : Number(input));

  return (
    <Grid minColumnWidth={vars.sizes.card.minWidth}>
      <SelectField label={t.model} hint={t.modelHints[value.model]} value={value.model} onChange={(model) => set('model', model)} options={brandModels.map((model) => ({ value: model, label: t.models[model] }))} />
      {value.model === 'commission' && (
        <TextField label={t.commissionRate} type="number" min={0} max={100} step="0.5" prefix="%" value={String(value.commissionRate)} error={errors.commissionRate} onChange={(input) => set('commissionRate', number(input))} />
      )}
      {!own && (
        <>
          <TextField label={t.monthlyFee} hint={t.monthlyFeeHint} type="number" min={0} prefix={value.feeCurrency} value={String(value.monthlyFee)} error={errors.monthlyFee} onChange={(input) => set('monthlyFee', number(input))} />
          <CurrencySelect label={t.feeCurrency} usedOnly value={value.feeCurrency} onChange={(currency) => set('feeCurrency', currency)} />
          <Checkbox label={t.deductFee} hint={t.deductFeeHint} checked={value.deductFeeFromPayout} onChange={(checked) => set('deductFeeFromPayout', checked)} />
          <SelectField label={t.payoutFrequency} value={value.payoutFrequency} onChange={(frequency) => set('payoutFrequency', frequency)} options={payoutFrequencies.map((frequency) => ({ value: frequency, label: t.frequencies[frequency] }))} />
          <CurrencySelect label={t.payoutCurrency} usedOnly value={value.payoutCurrency} onChange={(currency) => set('payoutCurrency', currency)} />
        </>
      )}
      <Checkbox label={t.allowDiscounts} hint={t.allowDiscountsHint} checked={value.allowDiscounts} onChange={(checked) => set('allowDiscounts', checked)} />
      {!own && value.allowDiscounts && (
        <SelectField label={t.discountFunding} value={value.discountFunding} onChange={(funding) => set('discountFunding', funding)} options={discountFundings.map((funding) => ({ value: funding, label: t.fundings[funding] }))} />
      )}
      {!own && value.allowDiscounts && value.discountFunding === 'shared' && (
        <TextField label={t.brandShare} hint={t.brandShareHint} type="number" min={0} max={100} prefix="%" value={String(value.brandSharePercent)} error={errors.brandSharePercent} onChange={(input) => set('brandSharePercent', number(input))} />
      )}
      {!own && (
        <SelectField label={t.defectPolicy} value={value.defectPolicy} onChange={(policy) => set('defectPolicy', policy)} options={defectPolicies.map((policy) => ({ value: policy, label: t.defectPolicies[policy] }))} />
      )}
      <TextField
        label={t.minMargin}
        hint={t.minMarginHint}
        type="number"
        min={0}
        max={100}
        prefix="%"
        value={value.minMargin === null ? '' : String(value.minMargin)}
        error={errors.minMargin}
        onChange={(input) => set('minMargin', input.trim() === '' ? null : Number(input))}
      />
    </Grid>
  );
};
