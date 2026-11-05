import { useState } from 'react';
import type { ProductInput } from '@/shared/api';
import { Button, Card, CheckboxGroup, FileField, Grid, Notice, SelectField, Stack, Text, TextField } from '@/shared/components';
import { useErrorMessage, useForm, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BrandSelect, CategorySelect } from '../../components';
import { validators } from '../../utils';

export interface ProductDetailsFormProps {
  initial: ProductInput;
  showPricing: boolean; // a new product also gets its first prices and cost
  currencies: string[];
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<unknown>;
}

// Brand, category, name, photo, season and collection, and the sizes and colours: one variant per combination.
export const ProductDetailsForm = ({ initial, showPricing, currencies, submitLabel, onSubmit }: ProductDetailsFormProps) => {
  const { text } = useLocale();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const check = validators(text);
  const t = text.owner.products;
  const [extraSize, setExtraSize] = useState('');
  const [extraColor, setExtraColor] = useState('');
  const form = useForm(
    { ...initial, cost: String(initial.cost), prices: Object.fromEntries(currencies.map((currency) => [currency, initial.prices[currency] === undefined ? '' : String(initial.prices[currency])])) as Record<string, string> },
    {
      name: check.required,
      brandId: check.required,
      categoryId: check.required,
      sizes: (value) => (value.length ? null : text.validation.required),
      colors: (value) => (value.length ? null : text.validation.required),
      cost: (value) => (showPricing ? check.nonNegative(value) : null),
    },
  );
  const sizes = [...new Set([...settings.sizes, ...form.values.sizes])];
  const colors = [...new Set([...settings.colors, ...form.values.colors])];
  const variantCount = form.values.sizes.length * form.values.colors.length;

  return (
    <Stack
      as="form"
      gap={vars.spacing[5]}
      onSubmit={form.submit((values) =>
        onSubmit({
          ...values,
          cost: Number(values.cost) || 0,
          prices: Object.fromEntries(Object.entries(values.prices).filter(([, price]) => price.trim() !== '').map(([currency, price]) => [currency, Number(price)])),
        }),
      )}
    >
      {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
      <Grid>
        <TextField label={t.name} required {...form.field('name')} />
        <BrandSelect value={form.values.brandId} onChange={(value) => form.setValue('brandId', value)} allLabel="" error={form.errors.brandId} />
        <CategorySelect value={form.values.categoryId} onChange={(value) => form.setValue('categoryId', value)} allLabel="" error={form.errors.categoryId} />
        <SelectField label={text.owner.fields.season} placeholder={text.common.none} value={form.values.season} onChange={(value) => form.setValue('season', value)} options={settings.seasons.map((value) => ({ value, label: value }))} />
        <TextField label={text.owner.fields.collection} {...form.field('collection')} />
      </Grid>
      <FileField label={t.photo} accept="image/*" value={form.values.photo ? { name: t.photo, size: 0, dataUrl: form.values.photo } : null} onChange={(file) => form.setValue('photo', file?.dataUrl)} />
      <Card title={t.variants} background={vars.colors.surfaceMuted}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.variantsHint} {variantCount ? `(${variantCount})` : ''}
        </Text>
        <CheckboxGroup label={t.sizes} options={sizes.map((value) => ({ value, label: value }))} value={form.values.sizes} onChange={(value) => form.setValue('sizes', value)} error={form.errors.sizes} />
        <Stack direction="row" align="flex-end" gap={vars.spacing[2]}>
          <TextField label={t.otherSize} value={extraSize} onChange={setExtraSize} width={vars.sizes.field.narrow} />
          <Button variant="secondary" size="sm" disabled={!extraSize.trim()} onClick={() => { form.setValue('sizes', [...form.values.sizes, extraSize.trim()]); setExtraSize(''); }}>
            {text.common.add}
          </Button>
        </Stack>
        <CheckboxGroup label={t.colors} options={colors.map((value) => ({ value, label: value }))} value={form.values.colors} onChange={(value) => form.setValue('colors', value)} error={form.errors.colors} />
        <Stack direction="row" align="flex-end" gap={vars.spacing[2]}>
          <TextField label={t.otherColor} value={extraColor} onChange={setExtraColor} width={vars.sizes.field.narrow} />
          <Button variant="secondary" size="sm" disabled={!extraColor.trim()} onClick={() => { form.setValue('colors', [...form.values.colors, extraColor.trim()]); setExtraColor(''); }}>
            {text.common.add}
          </Button>
        </Stack>
      </Card>
      {showPricing && (
        <Grid>
          <TextField label={t.unitCost} type="number" min={0} prefix={settings.baseCurrency} {...form.field('cost')} />
          {currencies.map((currency) => (
            <TextField
              key={currency}
              label={`${text.owner.fields.price} (${currency})`}
              type="number"
              min={0}
              prefix={currency}
              value={form.values.prices[currency] ?? ''}
              onChange={(value) => form.setValue('prices', { ...form.values.prices, [currency]: value })}
            />
          ))}
        </Grid>
      )}
      <Stack direction="row" justify="flex-end">
        <Button type="submit" disabled={form.submitting}>
          {submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
};
