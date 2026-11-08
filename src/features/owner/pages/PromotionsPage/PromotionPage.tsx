import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { decidePromotion, endPromotion, getPromotion, savePromotion, type PromotionInput } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Checkbox, CheckboxGroup, DetailList, Grid, Notice, PageHeader, SegmentedControl, SelectField, Stack, StatCard, TextField } from '@/shared/components';
import { promotionStateTone, routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import type { PromotionTargetKind } from '@/shared/types';
import { vars } from '@/shared/theme';
import { addDays, fillText, today } from '@/shared/utils';
import { ItemPicker } from '../../components/ItemPicker';
import { CurrencySelect } from '../../components';

const targetKinds: PromotionTargetKind[] = ['brand', 'category', 'products', 'variants'];

// Creates or edits a promotion, approves or rejects a brand's request, ends one early, and shows its results.
export const PromotionPage = () => {
  const { promotionId } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { brands, categories, branches, settings } = useReference();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const action = useAction();
  const state = useAsync(() => (promotionId ? getPromotion(promotionId) : Promise.resolve(null)), [promotionId, version], () => false);
  const [draft, setDraft] = useState<PromotionInput | null>(null);
  const [reason, setReason] = useState('');
  const t = text.owner.promotions;
  const sellingBranches = branches.filter((branch) => !branch.archived && branch.kind !== 'warehouse');

  return (
    <AsyncContent state={state}>
      {(data) => {
        const base: PromotionInput = data
          ? (({ id: _id, byId: _by, at: _at, decision: _decision, decisionReason: _reason, endedEarlyAt: _ended, requestedByBrandId: _requested, ...rest }) => rest)(data.promotion)
          : { name: '', target: { kind: 'brand', ids: [] }, discountType: 'percent', value: 10, startDate: today(), endDate: addDays(today(), 7), branchIds: sellingBranches.map((branch) => branch.id), brandSharePercent: 50, commissionOnOriginal: false };
        const value = draft ?? base;
        const set = (patch: Partial<PromotionInput>) => setDraft({ ...value, ...patch });
        const editable = !data || data.state === 'scheduled' || data.state === 'requested' || data.state === 'active';
        const allowed = brands.filter((brand) => brand.allowDiscounts);
        const invalid = !value.name.trim() || !(value.value > 0) || !value.target.ids.length || !value.branchIds.length || value.endDate < value.startDate;
        const money = (amount: number) => format.money(amount, settings.reportingCurrency);

        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: routes.owner.promotions, label: t.title }}
              title={data ? data.promotion.name : t.add}
              subtitle={data?.promotion.requestedByBrandId ? fillText(t.requestedBy, { brand: format.brand(data.promotion.requestedByBrandId) }) : undefined}
              actions={
                data && (
                  <>
                    <Badge variant={promotionStateTone[data.state]}>{t.states[data.state]}</Badge>
                    {data.state === 'active' && (
                      <Button variant="danger" disabled={Boolean(action.busy)} onClick={() => action.run('end', () => endPromotion(data.promotion.id))}>
                        {t.endNow}
                      </Button>
                    )}
                  </>
                )
              }
            />
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            {data?.blockedBrandIds.length ? <Notice tone="warning">{fillText(t.blocked, { brands: data.blockedBrandIds.map(format.brand).join(', ') })}</Notice> : null}
            {data && data.state !== 'requested' && (
              <Grid>
                <StatCard label={t.results.units} value={format.number(data.results.units)} />
                <StatCard label={t.results.sales} value={money(data.results.sales)} highlight />
                <StatCard label={t.results.discount} value={money(data.results.discount)} />
                <StatCard label={t.results.brandShare} value={money(data.results.brandShare)} />
                <StatCard label={t.results.storeShare} value={money(data.results.storeShare)} />
              </Grid>
            )}
            {data?.state === 'requested' && (
              <Card title={t.decide}>
                <TextField label={text.common.reason} value={reason} onChange={setReason} />
                <Stack direction="row" gap={vars.spacing[2]}>
                  <Button disabled={Boolean(action.busy)} onClick={() => action.run('approve', () => decidePromotion(data.promotion.id, true, reason || undefined))}>
                    {text.common.approve}
                  </Button>
                  <Button variant="secondary" disabled={Boolean(action.busy) || !reason.trim()} onClick={() => action.run('reject', () => decidePromotion(data.promotion.id, false, reason))}>
                    {text.common.reject}
                  </Button>
                </Stack>
              </Card>
            )}
            {data?.promotion.decisionReason && <Notice>{`${text.common.reason}: ${data.promotion.decisionReason}`}</Notice>}
            <Card title={t.details}>
              {editable ? (
                <Stack gap={vars.spacing[4]}>
                  <Grid>
                    <TextField label={text.common.name} value={value.name} onChange={(name) => set({ name })} required />
                    <SelectField label={t.discountType} value={value.discountType} onChange={(discountType) => set({ discountType })} options={(['percent', 'amount'] as const).map((type) => ({ value: type, label: t.discountTypes[type] }))} />
                    <TextField label={t.value} type="number" min={0} prefix={value.discountType === 'percent' ? undefined : value.currency} suffix={value.discountType === 'percent' ? text.common.percentSuffix : undefined} value={String(value.value)} onChange={(input) => set({ value: Number(input) })} />
                    {value.discountType === 'amount' && <CurrencySelect usedOnly value={value.currency ?? settings.baseCurrency} onChange={(currency) => set({ currency })} />}
                    <TextField label={text.owner.fields.startDate} type="date" value={value.startDate} onChange={(startDate) => set({ startDate })} />
                    <TextField label={text.owner.fields.endDate} type="date" min={value.startDate} value={value.endDate} onChange={(endDate) => set({ endDate })} error={value.endDate < value.startDate ? text.validation.endBeforeStart : undefined} />
                  </Grid>
                  <Stack gap={vars.spacing[2]}>
                    <SegmentedControl<PromotionTargetKind>
                      label={t.appliesTo}
                      value={value.target.kind}
                      onChange={(kind) => set({ target: { kind, ids: [] } })}
                      options={targetKinds.map((kind) => ({ value: kind, label: t.targets[kind] }))}
                    />
                    {value.target.kind === 'brand' && (
                      <CheckboxGroup hint={t.onlyAllowedBrands} options={allowed.map((brand) => ({ value: brand.id, label: brand.name }))} value={value.target.ids} onChange={(ids) => set({ target: { kind: 'brand', ids } })} />
                    )}
                    {value.target.kind === 'category' && (
                      <CheckboxGroup hint={t.categoryHint} options={categories.filter((category) => !category.archived).map((category) => ({ value: category.id, label: format.text(category.name) }))} value={value.target.ids} onChange={(ids) => set({ target: { kind: 'category', ids } })} />
                    )}
                    {(value.target.kind === 'products' || value.target.kind === 'variants') && (
                      <ItemPicker mode={value.target.kind} value={value.target.ids} onChange={(ids) => set({ target: { kind: value.target.kind, ids } })} />
                    )}
                  </Stack>
                  <CheckboxGroup label={t.branches} options={sellingBranches.map((branch) => ({ value: branch.id, label: branch.name }))} value={value.branchIds} onChange={(branchIds) => set({ branchIds })} />
                  <Grid>
                    <TextField label={t.brandShare} hint={fillText(t.splitHint, { store: format.percent(100 - value.brandSharePercent, 0) })} type="number" min={0} max={100} prefix="%" value={String(value.brandSharePercent)} onChange={(input) => set({ brandSharePercent: Number(input) })} />
                    <Checkbox label={t.commissionOnOriginal} hint={t.commissionOnOriginalHint} checked={value.commissionOnOriginal} onChange={(commissionOnOriginal) => set({ commissionOnOriginal })} />
                  </Grid>
                  <Stack direction="row" justify="flex-end">
                    <Button
                      disabled={invalid || Boolean(action.busy)}
                      onClick={async () => {
                        const saved = await action.run('save', () => savePromotion(value, data?.promotion.id));
                        if (saved) {
                          setDraft(null);
                          if (!data) navigate(toPath(routes.owner.promotion, { promotionId: saved.id }));
                        }
                      }}
                    >
                      {data ? text.common.saveChanges : t.add}
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <DetailList
                  items={[
                    { key: 'dates', label: text.common.date, value: `${format.date(value.startDate)} – ${format.date(value.endDate)}` },
                    { key: 'target', label: t.appliesTo, value: `${t.targets[value.target.kind]} (${value.target.ids.length})` },
                    { key: 'branches', label: t.branches, value: value.branchIds.map(format.branch).join(', ') },
                    { key: 'split', label: t.brandShare, value: format.percent(value.brandSharePercent, 0) },
                  ]}
                />
              )}
            </Card>
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
