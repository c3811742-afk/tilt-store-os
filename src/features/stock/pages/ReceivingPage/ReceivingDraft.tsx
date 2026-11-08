import { useState } from 'react';
import { confirmReceiving, saveReceivingLines, type ReceivingView, type VariantHit } from '@/shared/api';
import { Button, Card, DefectReasons, Notice, SignatureForm, Stack, Text, VariantSearch, defectReasonsComplete, emptySignature, signatureErrors, splitDefectReasons, type SignatureLine, type SignatureValue } from '@/shared/components';
import { useErrorMessage, useFormat, useLocale } from '@/shared/hooks';
import type { DefectReasonQty } from '@/shared/types';
import { vars } from '@/shared/theme';
import { safeAsync } from '@/shared/utils';
import { AddVariantModal } from './AddItemModals';

type Line = { variantId: string; productName: string; size: string; color: string; sku: string };

// Counting a delivery: scan each item, enter the quantity on the brand list, what arrived and what is defective.
// Then the courier signs for what they delivered and the storekeeper countersigns, and confirming adds the stock.
export const ReceivingDraft = ({ view, onConfirmed }: { view: ReceivingView; onConfirmed: () => void }) => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const t = text.storekeeper.receiving;
  const { receiving } = view;
  const [lines, setLines] = useState<Line[]>(() => view.lines.map(({ variantId, productName, size, color, sku }) => ({ variantId, productName, size, color, sku })));
  const [counts, setCounts] = useState<SignatureValue>(() => ({
    quantities: Object.fromEntries(view.lines.map((line) => [line.variantId, { expected: line.expected, received: line.received, defective: line.defective }])),
    name: '',
    confirmed: false,
  }));
  const [courier, setCourier] = useState<SignatureValue>(() => emptySignature([], []));
  const [mine, setMine] = useState<SignatureValue>(() => emptySignature([], []));
  const [reasons, setReasons] = useState<Record<string, DefectReasonQty[]>>(() => Object.fromEntries(view.lines.map((line) => [line.variantId, line.defectReasons ?? []])));
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<{ lines?: string; reasons?: boolean; courier?: { name?: string; confirmed?: string }; mine?: { name?: string; confirmed?: string } }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const qty = (variantId: string, key: string) => counts.quantities[variantId]?.[key] ?? 0;
  const add = (hit: VariantHit) => {
    if (!lines.some((line) => line.variantId === hit.variantId)) setLines([...lines, hit]);
    setCounts({ ...counts, quantities: { ...counts.quantities, [hit.variantId]: { expected: qty(hit.variantId, 'expected'), received: qty(hit.variantId, 'received') + 1, defective: qty(hit.variantId, 'defective') } } });
    setSaved(false);
  };
  const signLines: SignatureLine[] = lines.map((line) => {
    const missing = Math.max(qty(line.variantId, 'expected') - qty(line.variantId, 'received'), 0);
    return { variantId: line.variantId, label: `${line.productName} · ${line.size} · ${line.color}`, detail: [line.sku, missing ? `${t.missing} ${format.number(missing)}` : undefined].filter(Boolean).join(' · ') };
  });
  const reasonsOf = (variantId: string) => splitDefectReasons(reasons[variantId] ?? [], qty(variantId, 'defective'));
  const payload = () =>
    lines.map((line) => ({
      variantId: line.variantId,
      expected: qty(line.variantId, 'expected'),
      received: qty(line.variantId, 'received'),
      defective: qty(line.variantId, 'defective'),
      defectReasons: reasonsOf(line.variantId).filter((row) => row.reasonId && row.qty > 0),
    }));
  const defectiveLines = signLines.filter((line) => qty(line.variantId, 'defective') > 0);
  const messages = { name: text.staff.signature.nameRequired, confirmed: text.staff.signature.confirmRequired };

  const save = async () => {
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => saveReceivingLines(receiving.id, payload()));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setSaved(true);
  };

  const confirm = async () => {
    const found = {
      lines: payload().some((line) => line.received > 0) ? undefined : t.addItems,
      reasons: defectiveLines.some((line) => !defectReasonsComplete(reasons[line.variantId] ?? [], qty(line.variantId, 'defective'))),
      courier: signatureErrors(courier, messages),
      mine: signatureErrors(mine, messages),
    };
    setErrors(found);
    if (found.lines || found.reasons || found.courier.name || found.courier.confirmed || found.mine.name || found.mine.confirmed) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() =>
      confirmReceiving(receiving.id, {
        lines: payload(),
        courierName: courier.name,
        courierLines: lines.map((line) => ({ variantId: line.variantId, qty: courier.quantities[line.variantId]?.delivered ?? qty(line.variantId, 'received') })),
        storekeeperName: mine.name,
      }),
    );
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onConfirmed();
  };

  return (
    <Stack gap={vars.spacing[4]}>
      {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
      <Card
        title={t.items}
        actions={
          <Button variant="secondary" onClick={() => setAdding(true)}>
            {t.addVariant}
          </Button>
        }
      >
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.itemsHint}
        </Text>
        <VariantSearch onPick={add} disabled={busy} autoFocus />
        {lines.length ? (
          <SignatureForm
            showSigner={false}
            lines={signLines}
            fields={[
              { key: 'expected', label: t.expected, blankZero: true, placeholder: t.expectedPlaceholder },
              { key: 'received', label: t.received },
              { key: 'defective', label: t.defective, max: (_variantId: string, row: Record<string, number>) => row.received ?? 0 },
            ]}
            value={counts}
            onChange={(value) => {
              setCounts(value);
              setSaved(false);
            }}
            disabled={busy}
          />
        ) : (
          <Notice>{text.staff.items.noLines}</Notice>
        )}
        {errors.lines && (
          <Text variant="caption" color={vars.colors.danger}>
            {errors.lines}
          </Text>
        )}
        {defectiveLines.map((line) => {
          const total = qty(line.variantId, 'defective');
          return (
            <DefectReasons
              key={line.variantId}
              label={defectiveLines.length > 1 ? `${t.defectReason}: ${line.label}` : t.defectReason}
              total={total}
              value={reasons[line.variantId]}
              onChange={(value) => {
                setReasons({ ...reasons, [line.variantId]: value });
                setSaved(false);
              }}
              error={errors.reasons && !defectReasonsComplete(reasons[line.variantId] ?? [], total) ? text.staff.defects.reasonsIncomplete : undefined}
              disabled={busy}
            />
          );
        })}
        {saved && <Notice tone="success">{t.saved}</Notice>}
        <Stack direction="row" justify="flex-end">
          <Button variant="secondary" disabled={busy} onClick={() => void save()}>
            {t.save}
          </Button>
        </Stack>
      </Card>

      {lines.length > 0 && (
        <Card title={t.courierTitle}>
          <Text variant="bodySm" color={vars.colors.textMuted}>
            {t.courierHint}
          </Text>
          <SignatureForm
            lines={signLines.map((line) => ({ ...line, detail: `${t.received} ${format.number(qty(line.variantId, 'received'))}` }))}
            fields={[{ key: 'delivered', label: t.delivered }]}
            value={{ ...courier, quantities: Object.fromEntries(lines.map((line) => [line.variantId, { delivered: courier.quantities[line.variantId]?.delivered ?? qty(line.variantId, 'received') }])) }}
            onChange={setCourier}
            statement={t.courierStatement}
            errors={errors.courier}
            disabled={busy}
          />
        </Card>
      )}

      {lines.length > 0 && (
        <Card title={t.yourTitle}>
          <SignatureForm value={mine} onChange={setMine} statement={t.yourStatement} errors={errors.mine} disabled={busy} />
          <Text variant="caption" color={vars.colors.textMuted}>
            {t.confirmHint}
          </Text>
          <Stack direction="row" justify="flex-end">
            <Button disabled={busy} onClick={() => void confirm()}>
              {t.confirm}
            </Button>
          </Stack>
        </Card>
      )}

      {adding && (
        <AddVariantModal
          brandId={receiving.brandId}
          onClose={() => setAdding(false)}
          onAdded={(hit) => {
            setAdding(false);
            add(hit);
          }}
        />
      )}
    </Stack>
  );
};
