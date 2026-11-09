import { useNavigate } from 'react-router';
import { createReceiving } from '@/shared/api';
import { BrandSelect, Button, Card, Checkbox, Notice, PageHeader, Stack, TextAreaField, TextField } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useBranchScope, useErrorMessage, useForm, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// Starts receiving a brand delivery in the storekeeper's branch: the brand, its batch number and consignment.
export const NewReceivingPage = () => {
  const { text } = useLocale();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const t = text.storekeeper.receiving;
  const form = useForm({ brandId: '', batchNumber: '', note: '', consignment: false }, { brandId: (value) => (value ? null : t.chooseBrand) });

  const onSubmit = form.submit(async (values) => {
    const receiving = await createReceiving({ branchId, ...values });
    navigate(toPath(routes.storekeeper.receivingRecord, { receivingId: receiving.id }));
  });

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader back={{ to: routes.storekeeper.receiving, label: t.title }} title={t.newTitle} />
      <Card>
        <Stack as="form" gap={vars.spacing[4]} onSubmit={onSubmit}>
          {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
          <BrandSelect label={t.brand} allLabel={t.chooseBrand} value={form.values.brandId} onChange={(value) => form.setValue('brandId', value)} error={form.errors.brandId} width={vars.sizes.field.maxWidth} />
          <TextField label={t.batchNumber} hint={t.batchHint} {...form.field('batchNumber')} width={vars.sizes.field.maxWidth} />
          <Checkbox label={t.consignment} hint={t.consignmentHint} checked={form.values.consignment} onChange={(checked) => form.setValue('consignment', checked)} />
          <TextAreaField label={text.common.note} hint={text.common.optional} {...form.field('note')} />
          <Stack direction="row" justify="flex-end" gap={vars.spacing[2]}>
            <Button variant="secondary" onClick={() => navigate(routes.storekeeper.receiving)}>
              {text.common.cancel}
            </Button>
            <Button type="submit" disabled={form.submitting}>
              {t.start}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
};
