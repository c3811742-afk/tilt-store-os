import { useState } from 'react';
import { listPromoCodes, savePromoCode, type PromoCodeInput } from '@/shared/api';
import { AsyncContent, Badge, Button, Checkbox, Grid, Icon, IconButton, Modal, Notice, SelectField, Stack, Table, TextField } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import type { PromoCode } from '@/shared/types';
import { vars } from '@/shared/theme';
import { addDays, today } from '@/shared/utils';
import { usePromotionText } from './usePromotionText';

// Promo codes and influencer codes: the discount, who pays for it, the dates, and how much each code sold.
export const PromoCodesTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(listPromoCodes, [version]);
  const action = useAction();
  const describe = usePromotionText();
  const [draft, setDraft] = useState<(PromoCodeInput & { id?: string }) | null>(null);
  const t = text.owner.promotions;
  const blank: PromoCodeInput = { code: '', kind: 'promo', discountType: 'percent', value: 10, brandSharePercent: 0, startDate: today(), endDate: addDays(today(), 30), active: true };
  const edit = (code?: PromoCode) => setDraft(code ? { ...code } : blank);

  return (
    <Stack gap={vars.spacing[4]}>
      <Stack direction="row" justify="flex-end">
        <Button onClick={() => edit()}>
          <Icon name="plus" />
          {t.addCode}
        </Button>
      </Stack>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice>{t.noCodes}</Notice>}>
        {(rows) => (
          <Table
            label={t.tabs.codes}
            columns={[
              { key: 'code', label: t.code },
              { key: 'discount', label: t.discount },
              { key: 'dates', label: text.common.date },
              { key: 'orders', label: t.results.orders, align: 'end' },
              { key: 'sales', label: t.results.sales, align: 'end' },
              { key: 'status', label: text.common.status },
              { key: 'actions', label: '', align: 'end' },
            ]}
            rows={rows.map(({ code, results }) => ({
              key: code.id,
              cells: {
                code: `${code.code}${code.influencer ? ` · ${code.influencer}` : ''}`,
                discount: `${t.codeKinds[code.kind]} · ${describe(code)}`,
                dates: `${format.date(code.startDate)} – ${format.date(code.endDate)}`,
                orders: format.number(results.orders),
                sales: format.money(results.sales, settings.reportingCurrency),
                status: <Badge variant={code.active && code.endDate >= today() ? 'success' : 'neutral'}>{code.active && code.endDate >= today() ? t.states.active : t.states.ended}</Badge>,
                actions: <IconButton icon="pencil" label={text.common.edit} onClick={() => edit(code)} />,
              },
            }))}
          />
        )}
      </AsyncContent>
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? t.editCode : t.addCode}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft || !draft.code.trim() || !(draft.value > 0)) return;
          const { id, ...input } = draft;
          if (await action.run('code', () => savePromoCode(input, id))) setDraft(null);
        }}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              {text.common.cancel}
            </Button>
            <Button type="submit" disabled={Boolean(action.busy)}>
              {text.common.save}
            </Button>
          </>
        }
      >
        {draft && (
          <Grid minColumnWidth={vars.sizes.field.narrow}>
            <TextField label={t.code} value={draft.code} onChange={(code) => setDraft({ ...draft, code: code.toUpperCase() })} required />
            <SelectField label={t.codeKind} value={draft.kind} onChange={(kind) => setDraft({ ...draft, kind })} options={(['promo', 'influencer'] as const).map((value) => ({ value, label: t.codeKinds[value] }))} />
            {draft.kind === 'influencer' && <TextField label={t.influencer} value={draft.influencer ?? ''} onChange={(influencer) => setDraft({ ...draft, influencer })} />}
            <SelectField label={t.discountType} value={draft.discountType} onChange={(discountType) => setDraft({ ...draft, discountType })} options={(['percent', 'amount'] as const).map((value) => ({ value, label: t.discountTypes[value] }))} />
            <TextField label={t.value} type="number" min={0} value={String(draft.value)} onChange={(value) => setDraft({ ...draft, value: Number(value) })} />
            <TextField label={t.brandShare} hint={t.brandShareHint} type="number" min={0} max={100} suffix={text.common.percentSuffix} value={String(draft.brandSharePercent)} onChange={(value) => setDraft({ ...draft, brandSharePercent: Number(value) })} />
            <TextField label={text.owner.fields.startDate} type="date" value={draft.startDate} onChange={(startDate) => setDraft({ ...draft, startDate })} />
            <TextField label={text.owner.fields.endDate} type="date" min={draft.startDate} value={draft.endDate} onChange={(endDate) => setDraft({ ...draft, endDate })} />
            <Checkbox label={t.codeActive} checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
          </Grid>
        )}
      </Modal>
    </Stack>
  );
};
