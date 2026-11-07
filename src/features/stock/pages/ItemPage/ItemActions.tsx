import { useState, type ReactNode } from 'react';
import { getLabelItems, moveItem, setItemStatus, setMinQty, settableStatuses, type BranchItemHistoryData } from '@/shared/api';
import { Button, Modal, Notice, SelectField, Stack, Text, TextAreaField, TextField, WriteOffModal } from '@/shared/components';
import { useBranchScope, useErrorMessage, useFormat, useLocale } from '@/shared/hooks';
import type { StockStatus } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, printLabels, safeAsync } from '@/shared/utils';

type Dialog = 'status' | 'move' | 'min' | 'writeOff' | null;

// The storekeeper's actions on one item: change the status of some pieces, move pieces between the back room and
// the shop floor, set the branch minimum, write off, and print labels. Each one is a recorded movement.
export const ItemActions = ({ data }: { data: BranchItemHistoryData }) => {
  const { text, locale, theme } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState('');
  const t = text.storekeeper.stock;
  const item = `${data.productName} · ${data.size} · ${data.color}`;
  const hit = { variantId: data.variantId, barcode: '', productId: data.productId, productName: data.productName, brandId: data.brandId, size: data.size, color: data.color, sku: data.sku };

  const labels = async () => {
    const result = await safeAsync(() => getLabelItems(branchId, [data.variantId]));
    if (!result.ok) return;
    const printed = await safeAsync(async () =>
      printLabels(
        result.data.map((label) => ({ title: label.productName, detail: `${label.size} · ${label.color}`, price: label.price === null ? text.staff.print.noPrice : format.money(label.price, label.currency), barcode: label.barcode, copies: 1 })),
        { title: item, dir: theme.dir, lang: locale },
      ),
    );
    if (!printed.ok) setMessage(text.staff.print.blocked);
  };

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setDialog('status')}>
        {t.changeStatus}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setDialog('move')}>
        {t.move}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setDialog('min')}>
        {t.setMin}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setDialog('writeOff')}>
        {t.writeOff}
      </Button>
      <Button size="sm" variant="muted" onClick={() => void labels()}>
        {text.staff.print.printLabels}
      </Button>
      {message && <Notice tone="warning">{message}</Notice>}
      {dialog === 'status' && <StatusModal data={data} item={item} onClose={() => setDialog(null)} />}
      {dialog === 'move' && <MoveModal data={data} item={item} onClose={() => setDialog(null)} />}
      {dialog === 'min' && <MinModal data={data} item={item} onClose={() => setDialog(null)} />}
      {dialog === 'writeOff' && <WriteOffModal open initialItem={hit} onClose={() => setDialog(null)} onDone={() => setDialog(null)} />}
    </>
  );
};

interface ActionModalProps {
  data: BranchItemHistoryData;
  item: string;
  onClose: () => void;
}

// A small form in a dialog: runs `save`, closes on success, keeps the values and shows the message on failure.
const ActionModal = ({ title, hint, onClose, save, children }: { title: string; hint: string; onClose: () => void; save: () => Promise<unknown> | null; children: ReactNode }) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async () => {
    const call = save();
    if (!call) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => call);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
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
            {text.common.saveChanges}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {hint}
        </Text>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        {children}
      </Stack>
    </Modal>
  );
};

const StatusModal = ({ data, item, onClose }: ActionModalProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const t = text.storekeeper.stock;
  const statuses = text.owner.stock.statuses;
  const places = data.here.filter((level) => level.status !== 'inTransit');
  const [place, setPlace] = useState(places[0] ? `${places[0].locationId}|${places[0].status}` : '');
  const [to, setTo] = useState<StockStatus | ''>('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ to?: string; qty?: string }>({});
  const [locationId, from] = place.split('|') as [string, StockStatus];
  const there = places.find((level) => level.locationId === locationId && level.status === from)?.qty ?? 0;

  return (
    <ActionModal
      title={fillText(t.statusTitle, { item })}
      hint={t.statusHint}
      onClose={onClose}
      save={() => {
        const count = Math.floor(Number(qty));
        const found = { to: to ? undefined : text.validation.required, qty: count >= 1 && count <= there ? undefined : text.validation.positive };
        setErrors(found);
        if (found.to || found.qty || !to) return null;
        return setItemStatus({ branchId, variantId: data.variantId, locationId, from, to, qty: count, note: note.trim() || undefined });
      }}
    >
      {places.length ? (
        <SelectField
          label={t.where}
          value={place}
          onChange={setPlace}
          options={places.map((level) => ({ value: `${level.locationId}|${level.status}`, label: `${format.text(data.locationName[level.locationId])} · ${statuses[level.status]} · ${fillText(t.available, { qty: format.number(level.qty) })}` }))}
        />
      ) : (
        <Notice>{t.noneThere}</Notice>
      )}
      <SelectField<StockStatus | ''> label={t.toStatus} placeholder={t.toStatus} value={to} onChange={setTo} error={errors.to} options={settableStatuses.filter((status) => status !== from).map((status) => ({ value: status, label: statuses[status] }))} />
      <TextField label={text.common.quantity} type="number" inputMode="numeric" min={1} max={there} value={qty} onChange={setQty} error={errors.qty} width={vars.sizes.field.narrow} />
      <TextAreaField label={text.common.note} hint={text.common.optional} value={note} onChange={setNote} />
    </ActionModal>
  );
};

const MoveModal = ({ data, item, onClose }: ActionModalProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const t = text.storekeeper.stock;
  const locations = Object.keys(data.locationName);
  const availableAt = (id: string) => data.here.filter((level) => level.locationId === id && level.status === 'available').reduce((sum, level) => sum + level.qty, 0);
  const [from, setFrom] = useState(locations.find((id) => availableAt(id) > 0) ?? locations[0] ?? '');
  const [to, setTo] = useState(locations.find((id) => id !== from) ?? '');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState('');
  const option = (id: string) => ({ value: id, label: `${format.text(data.locationName[id])} · ${fillText(t.available, { qty: format.number(availableAt(id)) })}` });

  return (
    <ActionModal
      title={fillText(t.moveTitle, { item })}
      hint={t.moveHint}
      onClose={onClose}
      save={() => {
        const count = Math.floor(Number(qty));
        const ok = count >= 1 && count <= availableAt(from) && from !== to;
        setError(ok ? '' : text.validation.positive);
        return ok ? moveItem({ branchId, variantId: data.variantId, fromLocationId: from, toLocationId: to, qty: count }) : null;
      }}
    >
      <SelectField label={t.from} value={from} onChange={setFrom} options={locations.map(option)} />
      <SelectField label={t.to} value={to} onChange={setTo} options={locations.filter((id) => id !== from).map(option)} />
      <TextField label={text.common.quantity} type="number" inputMode="numeric" min={1} value={qty} onChange={setQty} error={error} width={vars.sizes.field.narrow} />
    </ActionModal>
  );
};

const MinModal = ({ data, item, onClose }: ActionModalProps) => {
  const { text } = useLocale();
  const { branchId } = useBranchScope();
  const t = text.storekeeper.stock;
  const [min, setMin] = useState(String(data.min));
  const [error, setError] = useState('');
  return (
    <ActionModal
      title={fillText(t.minTitle, { item })}
      hint={t.minHint}
      onClose={onClose}
      save={() => {
        const value = Math.floor(Number(min));
        const ok = min.trim() !== '' && value >= 0;
        setError(ok ? '' : text.validation.number);
        return ok ? setMinQty(branchId, data.variantId, value) : null;
      }}
    >
      <TextField label={t.minimum} type="number" inputMode="numeric" min={0} value={min} onChange={setMin} error={error} width={vars.sizes.field.narrow} />
    </ActionModal>
  );
};
