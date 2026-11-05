import { useNavigate } from 'react-router';
import { listBranches, type BranchListRow } from '@/shared/api';
import { AsyncContent, Badge, Button, Icon, PageHeader, Stack, Table, Text, recordRows } from '@/shared/components';
import { routes, toPath, withQuery } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// The branches that sell (stores and the online store), and the warehouses that only hold stock. Archived ones last.
export const BranchesPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const version = useLiveVersion();
  const state = useAsync(listBranches, [version]);
  const t = text.owner.branches;

  const list = (rows: BranchListRow[], label: string) => (
    <Table
      label={label}
      emptyText={t.none}
      columns={[
        { key: 'name', label: text.common.name },
        { key: 'kind', label: t.kind },
        { key: 'location', label: text.owner.fields.city },
        { key: 'currency', label: text.common.currency },
        { key: 'stock', label: t.stock, align: 'end' },
        { key: 'staff', label: t.staff, align: 'end' },
        { key: 'status', label: text.common.status },
      ]}
      rows={recordRows(
        [...rows].sort((a, b) => Number(a.branch.archived) - Number(b.branch.archived)),
        (row) => row.branch.id,
        [
          { key: 'name', label: '', render: (row) => row.branch.name },
          { key: 'kind', label: '', render: (row) => t.kinds[row.branch.kind] },
          { key: 'location', label: '', render: (row) => `${row.branch.city}, ${format.country(row.branch.countryCode)}` },
          { key: 'currency', label: '', render: (row) => row.branch.currency },
          { key: 'stock', label: '', render: (row) => format.number(row.stock) },
          { key: 'staff', label: '', render: (row) => format.number(row.staff) },
          { key: 'status', label: '', render: (row) => <Badge variant={row.branch.archived ? 'neutral' : 'success'}>{row.branch.archived ? text.common.archived : t.open}</Badge> },
        ],
        (row) => navigate(toPath(routes.owner.branch, { branchId: row.branch.id })),
      )}
    />
  );

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <Button onClick={() => navigate(routes.owner.newBranch)}>
            <Icon name="plus" />
            {t.add}
          </Button>
        }
      />
      <AsyncContent state={state}>
        {(rows) => (
          <Stack gap={vars.spacing[6]}>
            {list(rows.filter((row) => row.branch.kind !== 'warehouse'), t.title)}
            <Stack gap={vars.spacing[3]}>
              <Stack direction="row" justify="space-between" align="center" wrap>
                <Stack gap={vars.spacing[1]}>
                  <Text as="h2" variant="h3">
                    {t.warehouses}
                  </Text>
                  <Text variant="bodySm" color={vars.colors.textMuted}>
                    {t.warehousesHint}
                  </Text>
                </Stack>
                <Button variant="secondary" onClick={() => navigate(withQuery(routes.owner.newBranch, { kind: 'warehouse' }))}>
                  <Icon name="plus" />
                  {t.addWarehouse}
                </Button>
              </Stack>
              {list(rows.filter((row) => row.branch.kind === 'warehouse'), t.warehouses)}
            </Stack>
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
