import { useState } from 'react';
import { useParams } from 'react-router';
import { deliverTransfer, getDriverJob, pickUpTransfer } from '@/shared/api';
import { AsyncContent, Button, Card, Notice, PageHeader, SelectField, SignatureForm, Stack, Text, TransferSummary, emptySignature, signatureErrors, type SignatureValue } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';

type Job = Awaited<ReturnType<typeof getDriverJob>>;

// One job for the driver: sign for what they pick up (the stock leaves the branch) and for what they deliver at
// the store. Each signature is saved with the date, time, driver and the storekeeper on the other side.
export const JobPage = () => {
  const { transferId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(() => getDriverJob(transferId), [transferId, version]);
  const [done, setDone] = useState('');
  const t = text.driver.job;

  return (
    <AsyncContent state={state}>
      {(job) => (
        <Stack gap={vars.spacing[5]}>
          <PageHeader back={{ to: routes.driver.jobs, label: text.driver.jobs.title }} title={job.transfer.number} subtitle={fillText(t.route, { from: format.branch(job.transfer.fromBranchId), to: format.branch(job.transfer.toBranchId) })} />
          {done && <Notice tone="success">{done}</Notice>}
          {job.driverMismatch && <Notice tone="warning">{t.difference}</Notice>}
          {job.stage === 'approved' && <SignCard key="pickup" job={job} kind="pickup" onDone={() => setDone(t.pickedUp)} />}
          {job.stage === 'pickedUp' && <SignCard key="delivery" job={job} kind="delivery" onDone={() => setDone(t.delivered)} />}
          <TransferSummary view={job} />
        </Stack>
      )}
    </AsyncContent>
  );
};

const SignCard = ({ job, kind, onDone }: { job: Job; kind: 'pickup' | 'delivery'; onDone: () => void }) => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const t = text.driver.job;
  const pickup = kind === 'pickup';
  const people = pickup ? job.fromStorekeepers : job.toStorekeepers;
  const lines = job.lines.map((line) => ({
    variantId: line.variantId,
    label: `${line.productName} · ${line.size} · ${line.color}`,
    detail: pickup ? `${text.staff.transfers.requested} ${format.number(line.qty)}` : fillText(t.pickedUpQty, { qty: format.number(line.pickupQty ?? line.qty) }),
  }));
  const fields = [{ key: 'qty', label: pickup ? text.staff.transfers.pickedUp : text.staff.transfers.delivered }];
  const [value, setValue] = useState<SignatureValue>(() =>
    emptySignature(lines, fields, (variantId) => {
      const line = job.lines.find((current) => current.variantId === variantId);
      return pickup ? (line?.qty ?? 0) : (line?.pickupQty ?? line?.qty ?? 0);
    }),
  );
  const [personId, setPersonId] = useState(people.length === 1 ? people[0] : '');
  const [errors, setErrors] = useState<{ name?: string; confirmed?: string; person?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    const found = { ...signatureErrors(value, { name: text.staff.signature.nameRequired, confirmed: text.staff.signature.confirmRequired }), person: personId ? undefined : t.choosePerson };
    setErrors(found);
    if (found.name || found.confirmed || found.person) return;
    const quantities = lines.map((line) => ({ variantId: line.variantId, qty: value.quantities[line.variantId]?.qty ?? 0 }));
    setBusy(true);
    setError(null);
    const result = await safeAsync(() =>
      pickup ? pickUpTransfer(job.transfer.id, { signedName: value.name, lines: quantities, handedOverById: personId }) : deliverTransfer(job.transfer.id, { signedName: value.name, lines: quantities, deliveredToId: personId }),
    );
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onDone();
  };

  return (
    <Card title={pickup ? t.pickupTitle : t.deliveryTitle}>
      <Text variant="bodySm" color={vars.colors.textMuted}>
        {pickup ? t.pickupHint : t.deliveryHint}
      </Text>
      {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
      <SelectField
        label={pickup ? t.handedOverBy : t.receivedBy}
        placeholder={t.choosePerson}
        value={personId}
        onChange={setPersonId}
        error={errors.person}
        options={people.map((id) => ({ value: id, label: format.user(id) }))}
      />
      <SignatureForm lines={lines} fields={fields} value={value} onChange={setValue} statement={pickup ? t.pickupStatement : t.deliveryStatement} errors={errors} disabled={busy} />
      <Button fullWidth size="lg" disabled={busy} onClick={() => void submit()}>
        {pickup ? t.signPickup : t.signDelivery}
      </Button>
    </Card>
  );
};
