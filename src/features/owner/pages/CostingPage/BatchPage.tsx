import { useState } from 'react';
import { useParams } from 'react-router';
import { decideRedistribution, getBatch, recordBrandCredit, setBatchSellingPrice, updateBatch } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, DetailList, Grid, Notice, PageHeader, SelectField, Stack, StatCard, Table, Text, TextField } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import type { DefectHandling } from '@/shared/types';
import { vars } from '@/shared/theme';
import { batchUnitCosts, fillText } from '@/shared/utils';

// One batch: its cost, how defects change the cost of the good pieces, the owner's approval,
// brand credits, and for the store's own brand a new selling price.
export const BatchPage = () => {
  const { batchId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(() => getBatch(batchId), [batchId, version]);
  const action = useAction();
  const [draft, setDraft] = useState<{ totalCost: string; defects: string; defectHandling: DefectHandling } | null>(null);
  const [credit, setCredit] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [price, setPrice] = useState('');
  const t = text.owner.costing;

  return (
    <AsyncContent state={state}>
      {(data) => {
        const { batch, costs } = data;
        const value = draft ?? { totalCost: String(batch.totalCost), defects: String(batch.defects), defectHandling: batch.defectHandling };
        const preview = batchUnitCosts({ ...batch, totalCost: Number(value.totalCost) || 0, defects: Number(value.defects) || 0, defectHandling: value.defectHandling, redistribution: 'approved' });
        const money = (amount: number) => format.money(amount, batch.currency);
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader back={{ to: routes.owner.costing, label: t.title }} title={`${batch.number} · ${data.productName}`} subtitle={`${format.brand(batch.brandId)} · ${format.branch(batch.branchId)} · ${format.date(batch.receivedAt)}`} />
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            {batch.redistribution === 'pending' && (
              <Notice
                tone="warning"
                title={t.approvalTitle}
                action={
                  <Stack direction="row" gap={vars.spacing[2]}>
                    <Button size="sm" disabled={Boolean(action.busy)} onClick={() => action.run('approve', () => decideRedistribution(batch.id, true))}>
                      {text.common.approve}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('reject', () => decideRedistribution(batch.id, false))}>
                      {text.common.reject}
                    </Button>
                  </Stack>
                }
              >
                {fillText(t.approvalBody, { from: money(costs.original), to: money(costs.adjusted) })}
              </Notice>
            )}
            <Grid>
              <StatCard label={t.originalCost} value={money(costs.original)} detail={t.perPiece} />
              <StatCard label={t.adjustedCost} value={money(costs.effective)} detail={t.usedForSales} highlight />
              <StatCard label={t.goodPieces} value={format.number(batch.qty - batch.defects)} detail={fillText(t.ofTotal, { total: format.number(batch.qty) })} />
              {costs.writtenOffLoss > 0 && <StatCard label={t.writtenOffLoss} value={money(costs.writtenOffLoss)} />}
            </Grid>
            <Card title={t.costAndDefects}>
              <Text variant="bodySm" color={vars.colors.textMuted}>
                {t.example}
              </Text>
              <Grid minColumnWidth={vars.sizes.field.narrow}>
                <TextField label={t.totalCost} type="number" min={0} prefix={batch.currency} value={value.totalCost} onChange={(totalCost) => setDraft({ ...value, totalCost })} />
                <TextField label={t.defects} type="number" min={0} max={batch.qty} value={value.defects} onChange={(defects) => setDraft({ ...value, defects })} />
                <SelectField label={t.handling} value={value.defectHandling} onChange={(defectHandling) => setDraft({ ...value, defectHandling })} options={(['redistribute', 'writeOff'] as const).map((handling) => ({ value: handling, label: t.handlings[handling] }))} />
              </Grid>
              <DetailList
                items={[
                  { key: 'original', label: t.originalCost, value: money(preview.original) },
                  { key: 'new', label: value.defectHandling === 'redistribute' ? t.newCost : t.costStays, value: money(preview.adjusted) },
                  ...(value.defectHandling === 'writeOff' ? [{ key: 'loss', label: t.writtenOffLoss, value: money(preview.writtenOffLoss) }] : []),
                ]}
              />
              <Stack direction="row" justify="flex-end">
                <Button
                  disabled={!draft || Boolean(action.busy) || Number(value.defects) > batch.qty}
                  onClick={async () => {
                    if (await action.run('save', () => updateBatch(batch.id, { totalCost: Number(value.totalCost), defects: Number(value.defects), defectHandling: value.defectHandling }))) setDraft(null);
                  }}
                >
                  {text.common.saveChanges}
                </Button>
              </Stack>
            </Card>
            {data.model === 'own' && (
              <Card title={t.ownBrandPrice}>
                <Text variant="bodySm" color={vars.colors.textMuted}>
                  {data.suggestedPrice !== null ? fillText(t.suggestion, { price: money(data.suggestedPrice), current: data.currentPrice === null ? text.common.notSet : money(data.currentPrice) }) : t.noSuggestion}
                </Text>
                <Stack direction="row" wrap align="flex-end" gap={vars.spacing[2]}>
                  <TextField label={fillText(text.owner.products.pricing.priceIn, { currency: batch.currency })} type="number" min={0} value={price || (data.suggestedPrice ? String(data.suggestedPrice) : '')} onChange={setPrice} width={vars.sizes.field.narrow} />
                  <Button
                    variant="secondary"
                    disabled={Boolean(action.busy)}
                    onClick={() => {
                      const next = Number(price || data.suggestedPrice);
                      if (next > 0) void action.run('price', () => setBatchSellingPrice(batch.id, next));
                    }}
                  >
                    {t.setPrice}
                  </Button>
                </Stack>
              </Card>
            )}
            {data.model !== 'own' && (
              <Card title={t.brandCredit}>
                <Text variant="bodySm" color={vars.colors.textMuted}>
                  {fillText(t.brandCreditHint, { credited: money(batch.brandCredit) })}
                </Text>
                <Stack direction="row" wrap align="flex-end" gap={vars.spacing[2]}>
                  <TextField label={text.common.amount} type="number" min={0} prefix={batch.currency} value={credit} onChange={setCredit} width={vars.sizes.field.narrow} />
                  <TextField label={text.common.note} value={creditNote} onChange={setCreditNote} />
                  <Button
                    variant="secondary"
                    disabled={!(Number(credit) > 0) || Boolean(action.busy)}
                    onClick={async () => {
                      if (await action.run('credit', () => recordBrandCredit(batch.id, Number(credit), creditNote || undefined))) {
                        setCredit('');
                        setCreditNote('');
                      }
                    }}
                  >
                    {t.recordCredit}
                  </Button>
                </Stack>
              </Card>
            )}
            <Card title={t.defectRecords}>
              <Table
                label={t.defectRecords}
                emptyText={t.noDefects}
                columns={[
                  { key: 'date', label: text.common.date },
                  { key: 'qty', label: t.pieces, align: 'end' },
                  { key: 'reason', label: text.common.reason },
                  { key: 'who', label: t.liability },
                  { key: 'status', label: text.common.status },
                ]}
                rows={data.defects.map((defect) => ({
                  key: defect.id,
                  cells: {
                    date: format.date(defect.at),
                    qty: format.number(defect.qty),
                    reason: format.option(defect.reasonId),
                    who: t.liabilities[defect.liability],
                    status: <Badge>{text.owner.defects.statuses[defect.status]}</Badge>,
                  },
                }))}
              />
            </Card>
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
