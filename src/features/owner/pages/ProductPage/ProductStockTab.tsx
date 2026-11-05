import { Link } from 'react-router';
import { Card, Table } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useFormat, useLocale, useReference } from '@/shared/hooks';
import type { ProductData } from './types';

// Pieces of each variant in each branch (on hand: available, reserved and those waiting for inspection or return).
export const ProductStockTab = ({ data }: { data: ProductData }) => {
  const { text } = useLocale();
  const format = useFormat();
  const { branches } = useReference();
  const shown = branches.filter((branch) => data.levels.some((level) => level.branchId === branch.id));
  const qty = (variantId: string, branchId: string) => data.levels.filter((level) => level.variantId === variantId && level.branchId === branchId).reduce((sum, level) => sum + level.qty, 0);
  return (
    <Card title={text.owner.products.tabs.stock}>
      <Table
        label={text.owner.products.tabs.stock}
        emptyText={text.owner.products.noStock}
        columns={[{ key: 'variant', label: text.owner.fields.variant }, ...shown.map((branch) => ({ key: branch.id, label: branch.name, align: 'end' as const })), { key: 'total', label: text.common.total, align: 'end' }]}
        rows={data.product.variants
          .filter((variant) => !variant.archived)
          .map((variant) => ({
            key: variant.id,
            cells: {
              variant: <Link to={toPath(routes.owner.itemHistory, { variantId: variant.id })}>{`${variant.size} · ${variant.color}`}</Link>,
              ...Object.fromEntries(shown.map((branch) => [branch.id, format.number(qty(variant.id, branch.id))])),
              total: format.number(shown.reduce((sum, branch) => sum + qty(variant.id, branch.id), 0)),
            },
          }))}
      />
    </Card>
  );
};
