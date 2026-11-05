import { useNavigate } from 'react-router';
import { listStaff, type StaffMember } from '@/shared/api';
import { AsyncContent, Badge, Button, FilterBar, Icon, PageHeader, SelectField, Stack, Table, Text, TextField, Thumbnail, recordRows } from '@/shared/components';
import { routes, toPath, userStatusTone } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { matchesText } from '@/shared/utils';
import { BranchSelect } from '../../components';

// Everyone with an account: owners, branch staff, drivers and brand partners.
export const StaffPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { roles } = useReference();
  const version = useLiveVersion();
  const state = useAsync(listStaff, [version]);
  const [query, setQuery] = useQueryState('q', '');
  const [roleId, setRoleId] = useQueryState('role', '');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [status, setStatus] = useQueryState('status', 'active');
  const t = text.owner.staff;

  const shown = (rows: StaffMember[]) =>
    rows.filter(
      (row) =>
        matchesText(query, row.name, row.email, row.phone, row.username) &&
        (!roleId || row.roleIds.includes(roleId)) &&
        (!branchId || row.branchIds.includes(branchId)) &&
        (!status || row.status === status),
    );

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(routes.owner.roles)}>
              {text.nav.roles}
            </Button>
            <Button onClick={() => navigate(routes.owner.newStaff)}>
              <Icon name="plus" />
              {t.add}
            </Button>
          </>
        }
      />
      <FilterBar>
        <TextField type="search" label={text.common.search} value={query} onChange={setQuery} />
        <SelectField label={t.role} placeholder={text.common.all} value={roleId} onChange={setRoleId} options={roles.map((role) => ({ value: role.id, label: format.text(role.name) }))} />
        <BranchSelect kinds={['store', 'online', 'warehouse']} allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />
        <SelectField label={text.common.status} placeholder={text.common.all} value={status} onChange={setStatus} options={(['active', 'invited', 'inactive'] as const).map((value) => ({ value, label: t.statuses[value] }))} />
      </FilterBar>
      <AsyncContent state={state}>
        {(rows) => (
          <Table
            label={t.title}
            emptyText={text.common.noResults}
            columns={[
              { key: 'name', label: text.common.name },
              { key: 'roles', label: t.roles },
              { key: 'branches', label: t.branches },
              { key: 'status', label: text.common.status },
            ]}
            rows={recordRows(
              shown(rows),
              (row) => row.id,
              [
                {
                  key: 'name',
                  label: '',
                  render: (row) => (
                    <Stack direction="row" align="center" gap={vars.spacing[3]}>
                      <Thumbnail round src={row.photo} name={row.name} />
                      <Stack gap={vars.spacing[0]}>
                        <Text as="span" autoDirection>
                          {row.name}
                        </Text>
                        <Text as="span" variant="caption" color={vars.colors.textMuted}>
                          {row.email || row.phone}
                        </Text>
                      </Stack>
                    </Stack>
                  ),
                },
                { key: 'roles', label: '', render: (row) => row.roleIds.map(format.role).join(', ') + (row.brandId ? ` · ${format.brand(row.brandId)}` : '') },
                { key: 'branches', label: '', render: (row) => (row.brandId ? '' : row.branchIds.map(format.branch).join(', ')) },
                { key: 'status', label: '', render: (row) => <Badge variant={userStatusTone[row.status]}>{t.statuses[row.status]}</Badge> },
              ],
              (row) => navigate(toPath(routes.owner.staffMember, { userId: row.id })),
            )}
          />
        )}
      </AsyncContent>
    </Stack>
  );
};
