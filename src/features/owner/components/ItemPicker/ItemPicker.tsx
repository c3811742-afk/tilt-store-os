import { useState } from 'react';
import { listProducts } from '@/shared/api';
import { AsyncContent, Checkbox, Stack, Text, TextField } from '@/shared/components';
import { useAsync, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BrandSelect } from '../ReferenceSelect';
import styles from './ItemPicker.module.css';

export interface ItemPickerProps {
  mode: 'products' | 'variants';
  value: string[]; // the chosen product or variant ids
  onChange: (value: string[]) => void;
}

// Picks products, or single variants (sizes and colours), from a searchable list.
export const ItemPicker = ({ mode, value, onChange }: ItemPickerProps) => {
  const { text } = useLocale();
  const [query, setQuery] = useState('');
  const [brandId, setBrandId] = useState('');
  const state = useAsync(() => listProducts({ query, brandId: brandId || undefined }), [query, brandId]);
  const toggle = (id: string, checked: boolean) => onChange(checked ? [...value, id] : value.filter((current) => current !== id));
  const t = text.owner.picker;

  return (
    <Stack gap={vars.spacing[3]}>
      <Stack direction="row" wrap gap={vars.spacing[3]}>
        <TextField type="search" label={text.common.search} value={query} onChange={setQuery} width={vars.sizes.field.maxWidth} />
        <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} width={vars.sizes.field.narrow} />
      </Stack>
      <Text variant="caption" color={vars.colors.textMuted}>
        {`${value.length} ${t.selected}`}
      </Text>
      <div className={styles.list}>
        <AsyncContent state={state} empty={<Text variant="bodySm">{text.common.noResults}</Text>}>
          {(rows) => (
            <Stack gap={vars.spacing[2]}>
              {rows.map(({ product }) =>
                mode === 'products' ? (
                  <Checkbox key={product.id} label={product.name} checked={value.includes(product.id)} onChange={(checked) => toggle(product.id, checked)} />
                ) : (
                  <Stack key={product.id} gap={vars.spacing[1]}>
                    <Text as="span" variant="h4">
                      {product.name}
                    </Text>
                    <Stack direction="row" wrap gap={vars.spacing[3]}>
                      {product.variants
                        .filter((variant) => !variant.archived)
                        .map((variant) => (
                          <Checkbox key={variant.id} label={`${variant.size} · ${variant.color}`} checked={value.includes(variant.id)} onChange={(checked) => toggle(variant.id, checked)} />
                        ))}
                    </Stack>
                  </Stack>
                ),
              )}
            </Stack>
          )}
        </AsyncContent>
      </div>
    </Stack>
  );
};
