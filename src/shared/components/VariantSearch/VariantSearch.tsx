import { useState } from 'react';
import { searchVariants, type VariantHit } from '@/shared/api';
import { useErrorMessage, useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Notice } from '../Notice';
import { ScanField } from '../ScanField';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { variantSearchDefaults } from './VariantSearch.defaults';
import type { VariantSearchProps } from './VariantSearch.types';
import styles from './VariantSearch.module.css';

// Scan a barcode or search by name or SKU, then pick the size and colour. Used wherever staff list items.
export const VariantSearch = (props: VariantSearchProps) => {
  const p = withDefaults(variantSearchDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ query: string; hits: VariantHit[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const t = text.staff.items;

  const onScan = async (query: string) => {
    setBusy(true);
    setError(null);
    const found = await safeAsync(() => searchVariants(query));
    setBusy(false);
    if (!found.ok) return setError(found.error);
    if (found.data.length === 1 && (found.data[0].barcode === query || found.data[0].sku.toLowerCase() === query.toLowerCase())) {
      setResult(null);
      p.onPick?.(found.data[0]);
      return;
    }
    setResult({ query, hits: found.data });
  };

  const pick = (hit: VariantHit) => {
    setResult(null);
    p.onPick?.(hit);
  };

  return (
    <Stack gap={vars.spacing[2]}>
      <ScanField label={p.label} hint={p.hint} onScan={(code) => void onScan(code)} disabled={p.disabled || busy} autoFocus={p.autoFocus} width={p.width} />
      {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
      {result && !result.hits.length && <Notice>{fillText(t.noMatch, { query: result.query })}</Notice>}
      {result && result.hits.length > 0 && (
        <ul className={styles.list}>
          {result.hits.map((hit) => (
            <li key={hit.variantId} className={styles.item}>
              <Stack gap={vars.spacing[0]}>
                <Text as="span" variant="bodySm" autoDirection>
                  {hit.productName}
                </Text>
                <Text as="span" variant="caption" color={vars.colors.textMuted}>
                  {[hit.size, hit.color, format.brand(hit.brandId), hit.sku].filter(Boolean).join(' · ')}
                </Text>
              </Stack>
              <Button size="sm" variant="secondary" onClick={() => pick(hit)}>
                {t.add}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
};
