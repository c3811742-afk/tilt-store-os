import { useNavigate } from 'react-router';
import { listBranches } from '@/shared/api';
import { AsyncContent, Badge, Button, Icon, PageHeader, Stack, Table, recordRows } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// All branches in one list: stores, the online store and warehouses, archived ones last.
export const BranchesPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const version = useLiveVersion();
  const state = useAsync(listBranches, [version]);
  const t = text.owner.branches;

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
          <Table
            label={t.title}
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
        )}
      </AsyncContent>
    </Stack>
  );
};
