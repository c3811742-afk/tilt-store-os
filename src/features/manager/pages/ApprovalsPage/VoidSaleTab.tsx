import { useState } from 'react';
import { findBranchSale, voidSale, type SaleLookup } from '@/shared/api';
import { Badge, Button, Card, DecisionModal, Notice, ScanField, Stack, Table, Text } from '@/shared/components';
import { useBranchScope, useErrorMessage, useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';

// Finds a completed sale by its receipt number and voids it with a reason. The sale is kept, marked void, and its
// pieces go back into stock with a reversal movement.
export const VoidSaleTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const [found, setFound] = useState<SaleLookup | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [voiding, setVoiding] = useState(false);
  const [done, setDone] = useState('');
  const t = text.manager.approvals;

  const find = async (number: string) => {
    setError(null);
    const result = await safeAsync(() => findBranchSale(branchId, number));
    if (!result.ok) {
      setFound(null);
      return setError(result.error);
    }
    setFound(result.data);
  };

  return (
    <Stack gap={vars.spacing[4]}>
      <ScanField label={t.saleNumber} hint={t.saleHint} buttonLabel={t.findSale} onScan={(number) => {
          setDone('');
          void find(number);
        }} clearOnScan={false} />
      {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}
      {found && (
        <Card
          title={found.sale.number}
          actions={
            found.sale.voidedAt ? (
              <Badge variant="neutral">{fillText(t.voided, { user: format.user(found.sale.voidedById), date: format.dateTime(found.sale.voidedAt) })}</Badge>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setVoiding(true)}>
                {t.voidSale}
              </Button>
            )
          }
        >
          <Text variant="caption" color={vars.colors.textMuted}>
            {fillText(t.soldBy, { user: format.user(found.sale.cashierId), date: format.dateTime(found.sale.at) })}
          </Text>
          <Table
            label={found.sale.number}
            columns={[
              { key: 'item', label: text.staff.items.item },
              { key: 'qty', label: text.common.quantity, align: 'end' },
              { key: 'amount', label: text.common.amount, align: 'end' },
            ]}
            rows={found.lines.map((line) => ({ key: line.id, cells: { item: `${line.productName} · ${line.size} · ${line.color}`, qty: format.number(line.qty), amount: format.money(line.amount, found.sale.currency) } }))}
            footer={{ item: t.saleTotal, amount: format.money(found.total, found.sale.currency) }}
          />
          {found.sale.voidReasonId && <Text variant="bodySm">{[format.option(found.sale.voidReasonId), found.sale.voidNote].filter(Boolean).join(' · ')}</Text>}
        </Card>
      )}
      {found && (
        <DecisionModal
          open={voiding}
          decision="reject"
          title={fillText(t.voidTitle, { number: found.sale.number })}
          summary={t.voidHint}
          confirmLabel={t.voidSale}
          onClose={() => setVoiding(false)}
          onConfirm={async ({ reasonId, note }) => {
            await voidSale(found.sale.id, reasonId, note);
            setDone(fillText(t.voidDone, { number: found.sale.number }));
            await find(found.sale.number);
          }}
        />
      )}
    </Stack>
  );
};
