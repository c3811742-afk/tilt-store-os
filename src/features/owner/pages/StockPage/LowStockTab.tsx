import { Link } from 'react-router';
import { getLowStock } from '@/shared/api';
import { AsyncContent, Badge, Notice, Table } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';

// Items at or below their minimum in each store (out of stock first).
export const LowStockTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const state = useAsync(getLowStock, [version]);
  const t = text.owner.stock;
  return (
    <AsyncContent state={state} empty={<Notice tone="success">{t.noLowStock}</Notice>}>
      {(rows) => (
        <Table
          label={t.tabs.low}
          columns={[
            { key: 'item', label: text.owner.fields.product },
            { key: 'branch', label: text.owner.fields.branch },
            { key: 'qty', label: t.available, align: 'end' },
            { key: 'min', label: t.minimum, align: 'end' },
          ]}
          rows={rows.slice(0, 300).map((row) => ({
            key: `${row.variantId}|${row.branchId}`,
            cells: {
              item: <Link to={toPath(routes.owner.itemHistory, { variantId: row.variantId })}>{`${row.productName} · ${row.size} · ${row.color}`}</Link>,
              branch: format.branch(row.branchId),
              qty: row.qty <= 0 ? <Badge variant="danger">{t.outOfStock}</Badge> : format.number(row.qty),
              min: format.number(row.min),
            },
          }))}
        />
      )}
    </AsyncContent>
  );
};
