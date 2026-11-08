import { useState } from 'react';
import { useParams } from 'react-router';
import { cancelOnlineOrder, getOnlineOrder, markOrderDelivered, markOrderPacked, markOrderPaid, markOrderShipped, returnOnlineOrder, type OnlineOrderView } from '@/shared/api';
import {
  AsyncContent,
  Badge,
  Button,
  Card,
  DecisionModal,
  DetailList,
  Modal,
  Notice,
  PageHeader,
  SelectField,
  SignatureForm,
  Stack,
  StatusTimeline,
  Table,
  Text,
  TextField,
  emptySignature,
  type SignatureValue,
} from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';
import { orderStatusTone, orderSteps } from '../../constants/statuses';
import { PaymentChip } from '../../components/PaymentChip';

// One online order: who it is for, where it ships from, and its next step (pack, ship, deliver, mark paid), or
// cancelling it before it ships, or returning items after.
export const OrderPage = () => {
  const { orderId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const { branches } = useReference();
  const version = useLiveVersion();
  const state = useAsync(() => getOnlineOrder(orderId), [orderId, version]);
  const action = useAction();
  const [tracking, setTracking] = useState('');
  const [dialog, setDialog] = useState<'cancel' | 'return' | null>(null);
  const [done, setDone] = useState('');
  const t = text.online.order;

  return (
    <AsyncContent state={state}>
      {(view) => {
        const { order } = view;
        const location = branches.flatMap((branch) => branch.locations).find((current) => current.id === view.fulfilLocationId);
        const reached = orderSteps.indexOf(order.status);
        const stepAt = { new: order.at, packed: order.packedAt, shipped: order.shippedAt, delivered: order.deliveredAt };
        const stopped = order.status === 'cancelled' || order.status === 'returned';
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: routes.online.orders, label: text.online.orders.title }}
              title={`${order.number} · ${order.customer.name}`}
              actions={
                <Badge variant={orderStatusTone[order.status]}>{t.states[order.status]}</Badge>
              }
            />
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            {done && <Notice tone="success">{done}</Notice>}
            <Card>
              <StatusTimeline
                label={order.number}
                steps={[
                  ...orderSteps.map((status, index) => ({
                    key: status,
                    label: t.states[status],
                    detail: stepAt[status as keyof typeof stepAt] ? format.dateTime(stepAt[status as keyof typeof stepAt] ?? '') : undefined,
                    state: (stopped ? (stepAt[status as keyof typeof stepAt] ? 'done' : 'upcoming') : index < reached || (index === reached && status === 'delivered') ? 'done' : index === reached ? 'current' : 'upcoming') as 'done' | 'current' | 'upcoming',
                  })),
                  ...(stopped ? [{ key: order.status, label: t.states[order.status], detail: order.cancelledAt ? format.dateTime(order.cancelledAt) : undefined, state: 'stopped' as const }] : []),
                ]}
              />
            </Card>
            <Card
              actions={
                <>
                  {order.status !== 'cancelled' && <PaymentChip paid={order.paid} />}
                  {location && order.status !== 'cancelled' && <Badge>{fillText(t.reservedIn, { location: format.text(location.name) })}</Badge>}
                </>
              }
            >
              <DetailList
                items={[
                  { key: 'customer', label: t.customer, value: order.customer.name },
                  { key: 'phone', label: t.phone, value: order.customer.phone },
                  { key: 'address', label: t.address, value: `${order.customer.address}, ${order.customer.city}` },
                  { key: 'payment', label: t.payment, value: format.payment(order.methodId) },
                  { key: 'from', label: t.shipsFrom, value: format.branch(order.fulfilBranchId) },
                  { key: 'placed', label: t.placed, value: format.dateTime(order.at) },
                  ...(order.trackingNumber ? [{ key: 'tracking', label: t.tracking, value: order.trackingNumber }] : []),
                  ...(order.cancelReasonId ? [{ key: 'reason', label: t.reason, value: format.option(order.cancelReasonId) }] : []),
                ]}
              />
            </Card>
            <Card>
              <Table
                label={order.number}
                stackOnMobile
                columns={[
                  { key: 'item', label: text.staff.items.item },
                  { key: 'qty', label: text.common.quantity, align: 'end' },
                  { key: 'price', label: text.owner.fields.price, align: 'end' },
                  { key: 'returned', label: t.returnQty, align: 'end' },
                ]}
                rows={view.lines.map((line) => ({
                  key: line.variantId,
                  cells: { item: `${line.productName} · ${line.size} · ${line.color}`, qty: format.number(line.qty), price: format.money(line.unitPrice * line.qty, order.currency), returned: line.returned ? format.number(line.returned) : '' },
                }))}
                footer={{ item: t.total, price: format.money(view.total, order.currency) }}
              />
            </Card>
            {order.returns.length > 0 && (
              <Card title={t.returnItems}>
                {order.returns.map((entry) => (
                  <Text key={entry.id} variant="bodySm">
                    {[format.dateTime(entry.at), format.user(entry.byId), fillText(t.returned, { qty: format.number(entry.lines.reduce((sum, line) => sum + line.qty, 0)) }), format.option(entry.reasonId), entry.refund ? fillText(t.refund, { amount: format.money(entry.refund, order.currency) }) : t.noRefund].join(' · ')}
                  </Text>
                ))}
              </Card>
            )}
            <Card>
              <Stack gap={vars.spacing[3]}>
                {order.status === 'packed' && <TextField label={t.tracking} hint={t.trackingHint} value={tracking} onChange={setTracking} width={vars.sizes.field.maxWidth} />}
                <Stack direction="row" wrap gap={vars.spacing[2]} justify="flex-end">
                  {(order.status === 'new' || order.status === 'packed') && (
                    <Button variant="secondary" onClick={() => setDialog('cancel')}>
                      {t.cancel}
                    </Button>
                  )}
                  {(order.status === 'shipped' || order.status === 'delivered') && (
                    <Button variant="secondary" onClick={() => setDialog('return')}>
                      {t.returnItems}
                    </Button>
                  )}
                  {!order.paid && (order.status === 'shipped' || order.status === 'delivered') && (
                    <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('paid', () => markOrderPaid(order.id))}>
                      {t.markPaid}
                    </Button>
                  )}
                  {order.status === 'new' && (
                    <Button disabled={Boolean(action.busy)} onClick={() => action.run('packed', () => markOrderPacked(order.id))}>
                      {t.markPacked}
                    </Button>
                  )}
                  {order.status === 'packed' && (
                    <Button disabled={Boolean(action.busy)} onClick={() => action.run('shipped', () => markOrderShipped(order.id, tracking))}>
                      {t.markShipped}
                    </Button>
                  )}
                  {order.status === 'shipped' && (
                    <Button disabled={Boolean(action.busy)} onClick={() => action.run('delivered', () => markOrderDelivered(order.id))}>
                      {t.markDelivered}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Card>
            <DecisionModal
              open={dialog === 'cancel'}
              decision="reject"
              reasons="returnReasons"
              title={fillText(t.cancelTitle, { number: order.number })}
              summary={t.cancelHint}
              confirmLabel={t.cancel}
              onClose={() => setDialog(null)}
              onConfirm={({ reasonId }) => cancelOnlineOrder(order.id, reasonId)}
            />
            {dialog === 'return' && (
              <ReturnModal
                view={view}
                onClose={() => setDialog(null)}
                onDone={() => {
                  setDialog(null);
                  setDone(t.returnDone);
                }}
              />
            )}
          </Stack>
        );
      }}
    </AsyncContent>
  );
};

const ReturnModal = ({ view, onClose, onDone }: { view: OnlineOrderView; onClose: () => void; onDone: () => void }) => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const t = text.online.order;
  const open = view.lines.filter((line) => line.qty > (line.returned ?? 0));
  const lines = open.map((line) => ({ variantId: line.variantId, label: `${line.productName} · ${line.size} · ${line.color}`, detail: `${text.common.quantity} ${format.number(line.qty - (line.returned ?? 0))}` }));
  const fields = [{ key: 'qty', label: t.returnQty }];
  const [value, setValue] = useState<SignatureValue>(() => emptySignature(lines, fields, (variantId) => {
    const line = open.find((current) => current.variantId === variantId);
    return line ? line.qty - (line.returned ?? 0) : 0;
  }));
  const [reasonId, setReasonId] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; lines?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    const chosen = lines.map((line) => ({ variantId: line.variantId, qty: value.quantities[line.variantId]?.qty ?? 0 })).filter((line) => line.qty > 0);
    const found = { reason: reasonId ? undefined : text.validation.required, lines: chosen.length ? undefined : t.addItems };
    setErrors(found);
    if (found.reason || found.lines) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => returnOnlineOrder(view.order.id, { lines: chosen, reasonId }));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      width={vars.sizes.modal.wide}
      title={fillText(t.returnTitle, { number: view.order.number })}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {t.returnItems}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.returnHint}
        </Text>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        <SignatureForm showSigner={false} lines={lines} fields={fields} value={value} onChange={setValue} disabled={busy} />
        {errors.lines && (
          <Text variant="caption" color={vars.colors.danger}>
            {errors.lines}
          </Text>
        )}
        <SelectField
          label={t.reason}
          required
          placeholder={text.staff.decision.chooseReason}
          value={reasonId}
          onChange={setReasonId}
          error={errors.reason}
          options={settings.lists.returnReasons.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.option(option.id) }))}
        />
      </Stack>
    </Modal>
  );
};
