import { useState } from 'react';
import { useParams } from 'react-router';
import { assignDriver, cancelTransfer, getTransfer, listDrivers, pickUpTransfer, type StaffTransferView } from '@/shared/api';
import {
  AsyncContent,
  Button,
  Card,
  Notice,
  PageHeader,
  PrintButton,
  ReceiveTransferForm,
  SelectField,
  SignatureForm,
  Stack,
  Text,
  TransferSummary,
  emptySignature,
  signatureErrors,
  type SignatureValue,
} from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAction, useAsync, useBranchScope, useErrorMessage, useFormat, useLiveVersion, useLocale, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';

// One transfer for the storekeeper: assign a driver and hand the stock over against the driver's signature (it is
// then in transit), print the transfer note to go with it, or receive it when it arrives.
export const TransferPage = () => {
  const { transferId = '' } = useParams();
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const { session } = useSession();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const state = useAsync(() => getTransfer(transferId, branchId), [transferId, branchId, version]);
  const action = useAction();
  const [done, setDone] = useState('');
  const t = text.storekeeper.transfers;

  return (
    <AsyncContent state={state}>
      {(view) => {
        const { transfer } = view;
        const preparing = view.direction === 'out' && view.stage === 'approved';
        const arriving = view.direction === 'in' && (view.stage === 'pickedUp' || view.stage === 'delivered');
        const canCancel = transfer.requestedById === session?.user.id && (view.stage === 'requested' || view.stage === 'approved');
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: routes.storekeeper.transfers, label: text.nav.transfers }}
              title={transfer.number}
              subtitle={text.staff.transfers.directions[view.direction]}
              actions={
                <>
                  {canCancel && (
                    <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('cancel', () => cancelTransfer(transfer.id))}>
                      {text.staff.transfers.cancel}
                    </Button>
                  )}
                  <PrintButton label={t.printNote} />
                </>
              }
            />
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            {done && <Notice tone="success">{done}</Notice>}
            <TransferSummary view={view} />
            {preparing && <AssignDriverCard view={view} />}
            {preparing && transfer.driverId && <HandOverCard key={transfer.driverId} view={view} onDone={() => setDone(t.sent)} />}
            {arriving && <ReceiveTransferForm view={view} onDone={() => setDone(t.received)} />}
          </Stack>
        );
      }}
    </AsyncContent>
  );
};

const AssignDriverCard = ({ view }: { view: StaffTransferView }) => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const drivers = useAsync(() => listDrivers(branchId), [branchId], () => false);
  const action = useAction();
  const [driverId, setDriverId] = useState(view.transfer.driverId ?? '');
  const t = text.storekeeper.transfers;

  return (
    <Card title={t.assignDriver}>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Stack direction="row" wrap gap={vars.spacing[3]} align="flex-end">
        <SelectField
          label={text.staff.transfers.driver}
          placeholder={t.chooseDriver}
          value={driverId}
          onChange={setDriverId}
          options={(drivers.status === 'success' ? drivers.data : []).map((driver) => ({ value: driver.id, label: driver.name }))}
          width={vars.sizes.field.maxWidth}
        />
        <Button variant="secondary" disabled={!driverId || driverId === view.transfer.driverId || Boolean(action.busy)} onClick={() => action.run('assign', () => assignDriver(view.transfer.id, driverId))}>
          {t.assign}
        </Button>
      </Stack>
      {view.transfer.driverId && (
        <Text variant="caption" color={vars.colors.textMuted}>
          {fillText(t.assigned, { name: format.user(view.transfer.driverId) })}
        </Text>
      )}
    </Card>
  );
};

const HandOverCard = ({ view, onDone }: { view: StaffTransferView; onDone: () => void }) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const t = text.storekeeper.transfers;
  const lines = view.lines.map((line) => ({ variantId: line.variantId, label: `${line.productName} · ${line.size} · ${line.color}`, detail: `${text.staff.transfers.requested} ${line.qty}` }));
  const fields = [{ key: 'qty', label: text.staff.transfers.pickedUp }];
  const [value, setValue] = useState<SignatureValue>(() => emptySignature(lines, fields, (variantId) => view.lines.find((line) => line.variantId === variantId)?.qty ?? 0));
  const [errors, setErrors] = useState<{ name?: string; confirmed?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    const found = signatureErrors(value, { name: text.staff.signature.nameRequired, confirmed: text.staff.signature.confirmRequired });
    setErrors(found);
    if (found.name || found.confirmed) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => pickUpTransfer(view.transfer.id, { signedName: value.name, lines: lines.map((line) => ({ variantId: line.variantId, qty: value.quantities[line.variantId]?.qty ?? 0 })) }));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onDone();
  };

  return (
    <Card title={t.handOver}>
      <Text variant="bodySm" color={vars.colors.textMuted}>
        {t.handOverHint}
      </Text>
      {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
      <SignatureForm lines={lines} fields={fields} value={value} onChange={setValue} statement={t.handOverStatement} errors={errors} disabled={busy} />
      <Stack direction="row" justify="flex-end">
        <Button disabled={busy} onClick={() => void submit()}>
          {t.handOverButton}
        </Button>
      </Stack>
    </Card>
  );
};
