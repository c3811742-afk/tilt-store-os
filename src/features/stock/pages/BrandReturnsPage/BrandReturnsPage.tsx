import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createTransfer, listBrandReturns, listStoreDamaged } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, PageHeader, Stack, Table, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useBranchScope, useErrorMessage, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// Returns to brands from the storekeeper's branch, and the pieces damaged in the store that go to the warehouse.
export const BrandReturnsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const { branches } = useReference();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const returns = useAsync(() => listBrandReturns(branchId), [branchId, version]);
  const damaged = useAsync(() => listStoreDamaged(branchId), [branchId, version]);
  const action = useAction();
  const [done, setDone] = useState('');
  const t = text.storekeeper.brandReturns;
  const warehouse = branches.find((branch) => branch.kind === 'warehouse' && !branch.archived && branch.id !== branchId);

  const toWarehouse = async (lines: { variantId: string; qty: number }[]) => {
    if (!warehouse) return;
    const transfer = await action.run('warehouse', () => createTransfer({ fromBranchId: branchId, toBranchId: warehouse.id, lines, stockStatus: 'defective', note: t.damagedTitle }));
    if (transfer) setDone(fillText(t.sentToWarehouse, { number: transfer.number }));
  };

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} actions={<Button onClick={() => navigate(routes.storekeeper.newBrandReturn)}>{t.new}</Button>} />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}
      <AsyncContent state={returns} empty={<Notice>{t.none}</Notice>}>
        {(list) => (
          <Stack gap={vars.spacing[3]}>
            {list.map((record) => (
              <Card
                key={record.id}
                to={toPath(routes.storekeeper.brandReturn, { returnId: record.id })}
                title={`${record.number} · ${format.brand(record.brandId)}`}
                actions={<Badge variant={record.status === 'settled' ? 'success' : 'warning'}>{t.states[record.status]}</Badge>}
              >
                <Text variant="caption" color={vars.colors.textMuted}>
                  {fillText(t.summary, { pieces: format.pieces(record.lines.reduce((sum, line) => sum + line.qty, 0)), user: format.user(record.byId), date: format.dateTime(record.at) })}
                </Text>
              </Card>
            ))}
          </Stack>
        )}
      </AsyncContent>
      {warehouse && (
        <Card
          title={t.damagedTitle}
          actions={
            damaged.status === 'success' && damaged.data.length > 0 ? (
              <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => void toWarehouse(damaged.data.map((row) => ({ variantId: row.variantId, qty: row.qty })))}>
                {t.sendToWarehouse}
              </Button>
            ) : undefined
          }
        >
          <AsyncContent state={damaged} empty={<Text variant="bodySm">{t.noDamaged}</Text>}>
            {(rows) => (
              <Table
                label={t.damagedTitle}
                stackOnMobile
                columns={[
                  { key: 'item', label: text.staff.items.item },
                  { key: 'qty', label: text.common.quantity, align: 'end' },
                  { key: 'when', label: text.common.when },
                ]}
                rows={rows.map((row) => ({ key: row.defectId, cells: { item: `${row.productName} · ${row.size} · ${row.color}`, qty: format.number(row.qty), when: format.dateTime(row.at) } }))}
              />
            )}
          </AsyncContent>
        </Card>
      )}
    </Stack>
  );
};
