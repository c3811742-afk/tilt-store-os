import type { VariantHit } from '@/shared/api';
import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, withDefaults } from '@/shared/utils';
import { IconButton } from '../IconButton';
import { Stack } from '../Stack';
import { Table } from '../Table';
import { Text } from '../Text';
import { TextField } from '../TextField';
import { VariantSearch } from '../VariantSearch';
import { itemLinesEditorDefaults } from './ItemLinesEditor.defaults';
import type { ItemLine, ItemLinesEditorProps } from './ItemLinesEditor.types';

// A list of items and quantities built by scanning or searching. Scanning the same item again adds one more.
export const ItemLinesEditor = (props: ItemLinesEditorProps) => {
  const { lines, onChange, quantityLabel, error, disabled, autoFocus, stockBranchId } = withDefaults(itemLinesEditorDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const t = text.staff.items;

  const add = (hit: VariantHit) => {
    const existing = lines.find((line) => line.variantId === hit.variantId);
    const { variantId, barcode, productId, productName, brandId, size, color, sku } = hit;
    onChange?.(existing ? lines.map((line) => (line === existing ? { ...line, qty: line.qty + 1 } : line)) : [...lines, { variantId, barcode, productId, productName, brandId, size, color, sku, qty: 1 }]);
  };
  const setQty = (line: ItemLine, value: string) => {
    const qty = Math.max(0, Math.floor(Number(value) || 0));
    onChange?.(lines.map((current) => (current === line ? { ...current, qty } : current)));
  };
  const remove = (line: ItemLine) => onChange?.(lines.filter((current) => current !== line));
  const label = (line: ItemLine) => `${line.productName} · ${line.size} · ${line.color}`;
  const pieces = lines.reduce((sum, line) => sum + line.qty, 0);

  return (
    <Stack gap={vars.spacing[3]}>
      <VariantSearch onPick={add} disabled={disabled} autoFocus={autoFocus} stockBranchId={stockBranchId} />
      <Table
        label={t.item}
        stackOnMobile
        emptyText={t.noLines}
        columns={[
          { key: 'item', label: t.item },
          { key: 'qty', label: quantityLabel ?? t.quantity, align: 'end' },
          { key: 'remove', label: <span aria-hidden /> },
        ]}
        rows={lines.map((line) => ({
          key: line.variantId,
          cells: {
            item: (
              <Stack gap={vars.spacing[0]}>
                <Text as="span" variant="bodySm" autoDirection>
                  {line.productName}
                </Text>
                <Text as="span" variant="caption" color={vars.colors.textMuted}>
                  {[line.size, line.color, format.brand(line.brandId), line.sku].filter(Boolean).join(' · ')}
                </Text>
              </Stack>
            ),
            qty: <TextField label={<span aria-hidden />} type="number" inputMode="numeric" min={0} value={String(line.qty)} onChange={(value) => setQty(line, value)} disabled={disabled} width={vars.sizes.field.qty} />,
            remove: <IconButton icon="trash" label={fillText(t.remove, { item: label(line) })} onClick={() => remove(line)} disabled={disabled} />,
          },
        }))}
      />
      {lines.length > 0 && (
        <Text variant="caption" color={vars.colors.textMuted}>
          {fillText(t.lineCount, { lines: format.number(lines.length), pieces: format.number(pieces) })}
        </Text>
      )}
      {error && (
        <Text variant="caption" color={vars.colors.danger}>
          {error}
        </Text>
      )}
    </Stack>
  );
};
