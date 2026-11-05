import { Card, Checkbox, CheckboxGroup, Grid, SelectField, Stack, Text, TextField } from '@/shared/components';
import { useFormat, useLocale, useReference } from '@/shared/hooks';
import type { CountrySettings, RefundMethod } from '@/shared/types';
import { vars } from '@/shared/theme';
import { ConfigListEditor, ItemPicker, SettingsSection } from '../../components';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

const refundMethods: RefundMethod[] = ['cash', 'cardReversal', 'storeCredit'];

// Return and exchange rules per country, items that can't be returned, sale items, refund methods and reasons.
export const ReturnPolicies = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { categories } = useReference();
  const t = text.owner.policies;
  const draft = useSettingsDraft(['countries', 'crossCountryExchange', 'nonReturnable']);
  const { values, set } = draft;
  const setCountry = (code: string, patch: Partial<CountrySettings['returns']>) =>
    set('countries', values.countries.map((country) => (country.countryCode === code ? { ...country, returns: { ...country.returns, ...patch } } : country)));

  return (
    <Stack gap={vars.spacing[4]}>
      <SettingsSection title={t.returnRules} hint={t.returnRulesHint} draft={draft}>
        {values.countries.map((country) => (
          <Card key={country.countryCode} title={format.country(country.countryCode)} background={vars.colors.surfaceMuted}>
            <Grid minColumnWidth={vars.sizes.field.narrow}>
              <TextField label={t.returnDays} type="number" min={0} value={String(country.returns.days)} onChange={(value) => setCountry(country.countryCode, { days: Number(value) || 0 })} />
              <SelectField
                label={t.saleItems}
                value={country.returns.saleItems}
                onChange={(saleItems) => setCountry(country.countryCode, { saleItems })}
                options={(['refundOrExchange', 'exchangeOnly'] as const).map((value) => ({ value, label: t.saleItemRules[value] }))}
              />
            </Grid>
            <Checkbox label={t.receiptRequired} checked={country.returns.receiptRequired} onChange={(receiptRequired) => setCountry(country.countryCode, { receiptRequired })} />
            <Checkbox label={t.otherBranch} checked={country.returns.otherBranch} onChange={(otherBranch) => setCountry(country.countryCode, { otherBranch })} />
            <CheckboxGroup label={t.refundMethods} options={refundMethods.map((value) => ({ value, label: t.refundMethodNames[value] }))} value={country.returns.refundMethods} onChange={(selected) => setCountry(country.countryCode, { refundMethods: selected })} />
          </Card>
        ))}
        <Checkbox label={t.crossCountry} hint={t.crossCountryHint} checked={values.crossCountryExchange} onChange={(checked) => set('crossCountryExchange', checked)} />
        <CheckboxGroup
          label={t.nonReturnableCategories}
          options={categories.filter((category) => !category.archived).map((category) => ({ value: category.id, label: format.text(category.name) }))}
          value={values.nonReturnable.categoryIds}
          onChange={(categoryIds) => set('nonReturnable', { ...values.nonReturnable, categoryIds })}
        />
        <Stack gap={vars.spacing[2]}>
          <Text as="span" variant="bodySm">
            {t.nonReturnableProducts}
          </Text>
          <ItemPicker mode="products" value={values.nonReturnable.productIds} onChange={(productIds) => set('nonReturnable', { ...values.nonReturnable, productIds })} />
        </Stack>
      </SettingsSection>
      <ConfigListEditor listKey="returnReasons" title={t.returnReasons} hint={t.returnReasonsHint} />
    </Stack>
  );
};
