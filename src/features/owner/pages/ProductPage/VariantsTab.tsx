import { useState } from 'react';
import { generateBarcode, updateVariants } from '@/shared/api';
import { Badge, Button, Card, Icon, Notice, Stack, Table, TextField } from '@/shared/components';
import { useAction, useErrorMessage, useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { printLabels } from '@/shared/utils';
import type { ProductData } from './types';

// Each variant's SKU and barcode (generated for items without one, refused when already used), and label printing.
export const VariantsTab = ({ data, onSaved }: { data: ProductData; onSaved: () => void }) => {
  const { text, theme } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const action = useAction();
  const t = text.owner.products;
  const variants = data.product.variants.filter((variant) => !variant.archived);
  const [draft, setDraft] = useState(() => Object.fromEntries(variants.map((variant) => [variant.id, { sku: variant.sku, barcode: variant.barcode, barcodeGenerated: variant.barcodeGenerated }])));
  const [copies, setCopies] = useState<Record<string, string>>({});
  const [labelCurrency, setLabelCurrency] = useState(data.currencies[0] ?? '');
  const edit = (id: string, patch: Partial<(typeof draft)[string]>) => setDraft((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const duplicateInForm = (barcode: string) => Object.values(draft).filter((row) => row.barcode === barcode).length > 1;

  const print = () =>
    printLabels(
      variants.map((variant) => {
        const price = variant.prices[labelCurrency] ?? data.pricing.find((row) => row.currency === labelCurrency)?.price ?? undefined;
        return {
          title: data.product.name,
          detail: `${variant.size} · ${variant.color}`,
          price: price === undefined ? '' : format.money(price, labelCurrency),
          barcode: draft[variant.id]?.barcode ?? variant.barcode,
          copies: Number(copies[variant.id] ?? 0),
        };
      }),
      { title: data.product.name, dir: theme.dir, lang: theme.lang },
    );

  return (
    <Stack gap={vars.spacing[4]}>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Card
        title={t.tabs.variants}
        actions={
          <Button
            disabled={Boolean(action.busy)}
            onClick={async () => {
              const done = await action.run('save', () => updateVariants(data.product.id, Object.entries(draft).map(([id, row]) => ({ id, ...row }))));
              if (done) onSaved();
            }}
          >
            {text.common.saveChanges}
          </Button>
        }
      >
        <Table
          label={t.tabs.variants}
          columns={[
            { key: 'variant', label: text.owner.fields.variant },
            { key: 'sku', label: text.owner.fields.sku },
            { key: 'barcode', label: text.owner.fields.barcode },
            { key: 'labels', label: t.labelCopies, align: 'end' },
          ]}
          rows={variants.map((variant) => {
            const row = draft[variant.id];
            return {
              key: variant.id,
              cells: {
                variant: `${variant.size} · ${variant.color}`,
                sku: <TextField label="" value={row.sku} onChange={(sku) => edit(variant.id, { sku })} width={vars.sizes.field.narrow} />,
                barcode: (
                  <Stack direction="row" align="center" gap={vars.spacing[2]}>
                    <TextField
                      label=""
                      inputMode="numeric"
                      value={row.barcode}
                      error={duplicateInForm(row.barcode) ? text.errors.duplicateBarcode : undefined}
                      onChange={(barcode) => edit(variant.id, { barcode, barcodeGenerated: false })}
                    />
                    {row.barcodeGenerated && <Badge variant="info">{t.generated}</Badge>}
                    <Button
                      variant="muted"
                      size="sm"
                      onClick={async () => {
                        const barcode = await action.run(`generate-${variant.id}`, generateBarcode);
                        if (barcode) edit(variant.id, { barcode, barcodeGenerated: true });
                      }}
                    >
                      <Icon name="barcode" />
                      {t.generateBarcode}
                    </Button>
                  </Stack>
                ),
                labels: <TextField label="" type="number" min={0} value={copies[variant.id] ?? ''} onChange={(value) => setCopies((current) => ({ ...current, [variant.id]: value }))} width={vars.sizes.field.narrow} />,
              },
            };
          })}
        />
      </Card>
      <Card title={t.printLabels}>
        <Stack direction="row" wrap gap={vars.spacing[2]} align="flex-end">
          <Button
            variant="secondary"
            onClick={() => setCopies(Object.fromEntries(variants.map((variant) => [variant.id, String(Math.max(data.levels.filter((level) => level.variantId === variant.id).reduce((sum, level) => sum + level.qty, 0), 0))])))}
          >
            {t.oneLabelPerPiece}
          </Button>
          {data.currencies.map((currency) => (
            <Button key={currency} variant={currency === labelCurrency ? 'primary' : 'muted'} size="sm" onClick={() => setLabelCurrency(currency)}>
              {currency}
            </Button>
          ))}
          <Button disabled={!Object.values(copies).some((value) => Number(value) > 0)} onClick={print}>
            <Icon name="printer" />
            {t.printLabels}
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
};
