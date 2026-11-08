import { useState } from 'react';
import { listBrandPromotions, listBrandProducts, requestBrandPromotion } from '@/shared/api';
import { AsyncContent, Badge, Button, CheckboxGroup, Modal, Notice, PageHeader, Stack, Table, Text, TextField } from '@/shared/components';
import { promotionStateTone } from '@/shared/constants';
import { useAsync, useErrorMessage, useForm, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { addDays, fillText, today } from '@/shared/utils';

// The brand's promotions with the units sold during each, and asking for a new discount.
export const PromotionsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const { branches } = useReference();
  const t = text.brandPortal.promotions;
  const state = useAsync(listBrandPromotions, [version]);
  const products = useAsync(() => listBrandProducts(), []);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const stores = branches.filter((branch) => !branch.archived && branch.kind !== 'warehouse');
  const empty = { name: '', percent: '', startDate: addDays(today(), 7), endDate: addDays(today(), 14), productIds: [] as string[], branchIds: stores.map((branch) => branch.id) };
  const form = useForm(empty, {
    name: (value) => (value.trim() ? null : text.validation.required),
    percent: (value) => (Number(value) > 0 && Number(value) <= 100 ? null : text.validation.percent),
    startDate: (value) => (value >= today() ? null : t.startInPast),
    endDate: (value, values) => (value >= values.startDate ? null : text.validation.endBeforeStart),
    productIds: (value) => (value.length ? null : t.noProducts),
    branchIds: (value) => (value.length ? null : text.validation.required),
  });

  const onSubmit = form.submit(async (values) => {
    await requestBrandPromotion({ name: values.name, percent: Number(values.percent), startDate: values.startDate, endDate: values.endDate, productIds: values.productIds, branchIds: values.branchIds });
    form.reset(empty);
    setOpen(false);
    setSent(true);
  });

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} actions={<Button onClick={() => setOpen(true)}>{t.request}</Button>} />
      {sent && <Notice tone="success">{t.sent}</Notice>}
      <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
        {(rows) => (
          <Table
            label={t.title}
            stackOnMobile
            columns={[
              { key: 'name', label: t.name },
              { key: 'discount', label: t.percent, align: 'end' },
              { key: 'dates', label: t.dates },
              { key: 'branches', label: t.branches },
              { key: 'state', label: text.common.status },
              { key: 'units', label: t.units, align: 'end' },
            ]}
            rows={rows.map((row) => ({
              key: row.id,
              cells: {
                name: (
                  <Stack gap={vars.spacing[1]}>
                    <Text as="span" variant="bodySm" autoDirection>
                      {row.name}
                    </Text>
                    {row.requested && (
                      <Text as="span" variant="caption" color={vars.colors.textMuted}>
                        {t.requested}
                      </Text>
                    )}
                    {row.state === 'rejected' && row.decisionReason && (
                      <Text as="span" variant="caption" color={vars.colors.danger}>
                        {fillText(t.rejectedBecause, { reason: row.decisionReason })}
                      </Text>
                    )}
                  </Stack>
                ),
                discount: row.discountType === 'percent' ? format.percent(row.value, 0) : format.money(row.value, row.currency),
                dates: `${format.date(`${row.startDate}T12:00:00`)} – ${format.date(`${row.endDate}T12:00:00`)}`,
                branches: row.branchNames.join(text.common.listSeparator),
                state: <span><Badge variant={promotionStateTone[row.state]}>{text.owner.promotions.states[row.state]}</Badge></span>,
                units: format.number(row.units),
              },
            }))}
          />
        )}
      </AsyncContent>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t.form}
        width={vars.sizes.modal.wide}
        onSubmit={onSubmit}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {text.common.cancel}
            </Button>
            <Button type="submit" disabled={form.submitting}>
              {t.send}
            </Button>
          </>
        }
      >
        <Stack gap={vars.spacing[4]}>
          <Text variant="caption" color={vars.colors.textMuted}>
            {t.formHint}
          </Text>
          {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
          <TextField label={t.name} {...form.field('name')} width="100%" />
          <TextField label={t.percent} type="number" inputMode="decimal" min={1} max={100} suffix={text.common.percentSuffix} {...form.field('percent')} width={vars.sizes.field.narrow} />
          <Stack direction="row" wrap gap={vars.spacing[3]}>
            <TextField label={t.startDate} type="date" min={today()} {...form.field('startDate')} width={vars.sizes.field.narrow} />
            <TextField label={t.endDate} type="date" min={form.values.startDate} {...form.field('endDate')} width={vars.sizes.field.narrow} />
          </Stack>
          <CheckboxGroup label={t.branches} value={form.values.branchIds} onChange={(value) => form.setValue('branchIds', value)} options={stores.map((branch) => ({ value: branch.id, label: branch.name }))} error={form.errors.branchIds} />
          <AsyncContent state={products}>
            {(list) => <CheckboxGroup label={t.chooseProducts} value={form.values.productIds} onChange={(value) => form.setValue('productIds', value)} options={list.map((product) => ({ value: product.id, label: product.name }))} error={form.errors.productIds} />}
          </AsyncContent>
        </Stack>
      </Modal>
    </Stack>
  );
};
