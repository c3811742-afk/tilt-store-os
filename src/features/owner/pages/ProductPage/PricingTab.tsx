import { useState } from 'react';
import { cancelSchedule, schedulePrice, setPrices, setProductCost } from '@/shared/api';
import { Badge, Button, Card, DetailList, Grid, Notice, SegmentedControl, SelectField, Stack, Table, Text, TextField } from '@/shared/components';
import { useAction, useErrorMessage, useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, priceMargins, shopPrice, suggestedPrice, today } from '@/shared/utils';
import type { ScheduleKind } from '@/shared/types';
import type { ProductData } from './types';

// Prices per currency (entered, never converted), variant prices, cost, margin and markup as you type,
// a suggested price for the target margin, scheduled changes and sales, and the full history.
export const PricingTab = ({ data, onSaved }: { data: ProductData; onSaved: () => void }) => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const action = useAction();
  const t = text.owner.products.pricing;
  const { product } = data;
  const commission = data.model === 'commission';
  const [prices, setPricesDraft] = useState<Record<string, string>>(() => Object.fromEntries(data.currencies.map((currency) => [currency, product.prices[currency] === undefined ? '' : String(product.prices[currency])])));
  const [variantPrices, setVariantPrices] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(product.variants.map((variant) => [variant.id, Object.fromEntries(data.currencies.map((currency) => [currency, variant.prices[currency] === undefined ? '' : String(variant.prices[currency])]))])),
  );
  const [cost, setCost] = useState(String(product.cost));
  const [costWarnings, setCostWarnings] = useState<string[]>([]);
  const [schedule, setSchedule] = useState({ kind: 'sale' as ScheduleKind, currency: data.currencies[0] ?? '', variantId: '', price: '', startDate: today(), endDate: '' });

  const rows = data.pricing.map((pricing) => {
    const typed = Number(prices[pricing.currency]);
    const margins = prices[pricing.currency]?.trim() ? priceMargins(typed, pricing.unitCost, pricing.vatRate) : null;
    const suggestion = shopPrice(suggestedPrice(pricing.unitCost, data.minMargin, pricing.vatRate));
    return { pricing, margins, suggestion };
  });

  const savePrices = async () => {
    const done = await action.run('prices', () =>
      setPrices(
        product.id,
        Object.fromEntries(Object.entries(prices).filter(([, value]) => value.trim() !== '').map(([currency, value]) => [currency, Number(value)])),
        Object.fromEntries(
          Object.entries(variantPrices).map(([variantId, perCurrency]) => [variantId, Object.fromEntries(Object.entries(perCurrency).map(([currency, value]) => [currency, value.trim() === '' ? null : Number(value)]))]),
        ),
      ),
    );
    if (done) onSaved();
  };

  const saveCost = async () => {
    const below = await action.run('cost', () => setProductCost(product.id, Number(cost)));
    if (below) {
      setCostWarnings(below.map((row) => fillText(t.costWarning, { currency: row.currency, margin: format.percent(row.margin ?? 0), minimum: format.percent(data.minMargin) })));
      onSaved();
    }
  };

  return (
    <Stack gap={vars.spacing[4]}>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      {costWarnings.map((warning) => (
        <Notice key={warning} tone="warning">
          {warning}
        </Notice>
      ))}
      <Card title={t.prices} actions={<Button onClick={savePrices} disabled={Boolean(action.busy)}>{t.savePrices}</Button>}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {fillText(t.pricesHint, { margin: format.percent(data.minMargin) })}
        </Text>
        <Grid>
          {rows.map(({ pricing, margins, suggestion }) => (
            <Card key={pricing.currency} background={vars.colors.surfaceMuted} gap={vars.spacing[3]}>
              <TextField label={fillText(t.priceIn, { currency: pricing.currency })} type="number" min={0} prefix={pricing.currency} value={prices[pricing.currency] ?? ''} onChange={(value) => setPricesDraft((current) => ({ ...current, [pricing.currency]: value }))} />
              <DetailList
                items={[
                  { key: 'cost', label: commission ? t.brandShare : text.owner.fields.cost, value: format.money(pricing.unitCost, pricing.currency) },
                  { key: 'margin', label: text.owner.fields.margin, value: margins ? <Text as="span" color={margins.margin < data.minMargin ? vars.colors.danger : vars.colors.text}>{format.percent(margins.margin)}</Text> : text.common.notSet },
                  { key: 'markup', label: text.owner.fields.markup, value: margins ? format.percent(margins.markup) : text.common.notSet },
                  { key: 'vat', label: t.vat, value: format.percent(pricing.vatRate) },
                ]}
              />
              <Stack direction="row" align="center" gap={vars.spacing[2]} wrap>
                <Text as="span" variant="caption" color={vars.colors.textMuted}>
                  {fillText(t.suggested, { price: format.money(suggestion, pricing.currency), margin: format.percent(data.minMargin) })}
                </Text>
                <Button variant="muted" size="sm" onClick={() => setPricesDraft((current) => ({ ...current, [pricing.currency]: String(suggestion) }))}>
                  {t.useSuggested}
                </Button>
              </Stack>
              {pricing.salePrice !== null && <Badge variant="brand">{fillText(t.onSale, { price: format.money(pricing.salePrice, pricing.currency) })}</Badge>}
            </Card>
          ))}
        </Grid>
      </Card>

      <Card title={t.variantPrices}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.variantPricesHint}
        </Text>
        <Table
          label={t.variantPrices}
          columns={[{ key: 'variant', label: text.owner.fields.variant }, ...data.currencies.map((currency) => ({ key: currency, label: currency }))]}
          rows={product.variants
            .filter((variant) => !variant.archived)
            .map((variant) => ({
              key: variant.id,
              cells: {
                variant: `${variant.size} · ${variant.color}`,
                ...Object.fromEntries(
                  data.currencies.map((currency) => [
                    currency,
                    <TextField
                      key={currency}
                      label=""
                      type="number"
                      min={0}
                      placeholder={prices[currency] || ''}
                      value={variantPrices[variant.id]?.[currency] ?? ''}
                      onChange={(value) => setVariantPrices((current) => ({ ...current, [variant.id]: { ...current[variant.id], [currency]: value } }))}
                      width={vars.sizes.field.narrow}
                    />,
                  ]),
                ),
              },
            }))}
        />
      </Card>

      <Card title={t.cost}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {fillText(t.costHint, { cost: format.money(data.unitCost, data.baseCurrency) })}
        </Text>
        <Stack direction="row" wrap gap={vars.spacing[2]} align="flex-end">
          <TextField label={t.baseCost} type="number" min={0} prefix={data.baseCurrency} value={cost} onChange={setCost} width={vars.sizes.field.narrow} />
          <Button variant="secondary" disabled={Boolean(action.busy) || cost.trim() === ''} onClick={saveCost}>
            {t.saveCost}
          </Button>
        </Stack>
      </Card>

      <Card title={t.schedules}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.schedulesHint}
        </Text>
        <SegmentedControl<ScheduleKind>
          label={t.scheduleKind}
          value={schedule.kind}
          onChange={(kind) => setSchedule((current) => ({ ...current, kind }))}
          options={[
            { value: 'sale', label: t.kinds.sale },
            { value: 'change', label: t.kinds.change },
          ]}
        />
        <Grid minColumnWidth={vars.sizes.field.narrow}>
          <SelectField label={text.common.currency} value={schedule.currency} onChange={(currency) => setSchedule((current) => ({ ...current, currency }))} options={data.currencies.map((currency) => ({ value: currency, label: currency }))} />
          <SelectField
            label={text.owner.fields.variant}
            placeholder={t.allVariants}
            value={schedule.variantId}
            onChange={(variantId) => setSchedule((current) => ({ ...current, variantId }))}
            options={product.variants.filter((variant) => !variant.archived).map((variant) => ({ value: variant.id, label: `${variant.size} · ${variant.color}` }))}
          />
          <TextField label={text.owner.fields.price} type="number" min={0} value={schedule.price} onChange={(price) => setSchedule((current) => ({ ...current, price }))} />
          <TextField label={text.owner.fields.startDate} type="date" min={today()} value={schedule.startDate} onChange={(startDate) => setSchedule((current) => ({ ...current, startDate }))} />
          {schedule.kind === 'sale' && <TextField label={text.owner.fields.endDate} type="date" min={schedule.startDate} value={schedule.endDate} onChange={(endDate) => setSchedule((current) => ({ ...current, endDate }))} />}
        </Grid>
        <Stack direction="row" justify="flex-end">
          <Button
            disabled={Boolean(action.busy) || !(Number(schedule.price) > 0) || (schedule.kind === 'sale' && !schedule.endDate)}
            onClick={async () => {
              const done = await action.run('schedule', () =>
                schedulePrice({ productId: product.id, kind: schedule.kind, currency: schedule.currency, variantId: schedule.variantId || undefined, price: Number(schedule.price), startDate: schedule.startDate, endDate: schedule.kind === 'sale' ? schedule.endDate : undefined }),
              );
              if (done) {
                setSchedule((current) => ({ ...current, price: '', endDate: '' }));
                onSaved();
              }
            }}
          >
            {t.schedule}
          </Button>
        </Stack>
        <Table
          label={t.schedules}
          emptyText={t.noSchedules}
          columns={[
            { key: 'kind', label: t.scheduleKind },
            { key: 'price', label: text.owner.fields.price, align: 'end' },
            { key: 'variant', label: text.owner.fields.variant },
            { key: 'dates', label: text.common.date },
            { key: 'status', label: text.common.status },
            { key: 'actions', label: '' },
          ]}
          rows={data.schedules.map((row) => {
            const variant = product.variants.find((current) => current.id === row.variantId);
            const day = today();
            const status = row.cancelled ? 'cancelled' : row.startDate > day ? 'scheduled' : !row.endDate || row.endDate >= day ? 'running' : 'ended';
            return {
              key: row.id,
              cells: {
                kind: t.kinds[row.kind],
                price: format.money(row.price, row.currency),
                variant: variant ? `${variant.size} · ${variant.color}` : t.allVariants,
                dates: row.endDate ? `${format.date(row.startDate)} – ${format.date(row.endDate)}` : format.date(row.startDate),
                status: <Badge variant={status === 'running' ? 'success' : status === 'scheduled' ? 'info' : 'neutral'}>{t.scheduleStates[status]}</Badge>,
                actions:
                  status === 'scheduled' || (status === 'running' && row.kind === 'sale') ? (
                    <Button variant="muted" size="sm" onClick={() => action.run(`cancel-${row.id}`, () => cancelSchedule(row.id))}>
                      {text.common.cancel}
                    </Button>
                  ) : null,
              },
            };
          })}
        />
      </Card>

      <Card title={t.history}>
        <Table
          label={t.history}
          emptyText={t.noHistory}
          columns={[
            { key: 'when', label: text.common.when },
            { key: 'what', label: t.change },
            { key: 'from', label: text.common.from, align: 'end' },
            { key: 'to', label: text.common.to, align: 'end' },
            { key: 'by', label: text.common.by },
          ]}
          rows={data.history.map((row) => {
            const variant = product.variants.find((current) => current.id === row.variantId);
            const money = (value: number | null) => (value === null ? '—' : format.money(value, row.currency));
            return {
              key: row.id,
              cells: {
                when: format.dateTime(row.at),
                what: `${t.historyKinds[row.kind]} · ${row.currency}${variant ? ` · ${variant.size} ${variant.color}` : ''}`,
                from: money(row.from),
                to: money(row.to),
                by: format.user(row.byId),
              },
            };
          })}
        />
      </Card>
    </Stack>
  );
};
