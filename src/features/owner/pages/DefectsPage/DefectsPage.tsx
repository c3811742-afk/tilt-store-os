import { Link } from 'react-router';
import { decideWriteOff, listDefects, listWriteOffs } from '@/shared/api';
import { AsyncContent, Badge, Button, FilterBar, Grid, Notice, PageHeader, SelectField, Stack, StatCard, Table, Tabs } from '@/shared/components';
import { approvalStateTone, defectStatusTone, routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BranchSelect, BrandSelect, PeriodFilter } from '../../components';
import { usePeriod } from '../../hooks';

type DefectsTab = 'defects' | 'writeOffs';

// Every defect by brand, batch, branch and reason, what it cost the store vs the brands, and write-offs to approve.
export const DefectsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const period = usePeriod('last90');
  const [tab, setTab] = useQueryState<DefectsTab>('tab', 'defects');
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [reasonId, setReasonId] = useQueryState('reason', '');
  const version = useLiveVersion();
  const defects = useAsync(() => listDefects({ range: period.range, brandId: brandId || undefined, branchId: branchId || undefined, reasonId: reasonId || undefined }), [period.range.from, period.range.to, brandId, branchId, reasonId, version]);
  const writeOffs = useAsync(listWriteOffs, [version]);
  const action = useAction();
  const t = text.owner.defects;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Tabs<DefectsTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'defects', label: t.tabs.defects },
          { value: 'writeOffs', label: t.tabs.writeOffs, count: writeOffs.status === 'success' ? writeOffs.data.filter((row) => row.writeOff.status === 'pending').length : undefined },
        ]}
      >
        {tab === 'defects' && (
          <Stack gap={vars.spacing[4]}>
            <PeriodFilter period={period} />
            <FilterBar>
              <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />
              <BranchSelect kinds={['store', 'warehouse', 'online']} allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />
              <SelectField label={text.common.reason} placeholder={text.common.all} value={reasonId} onChange={setReasonId} options={settings.lists.defectReasons.map((option) => ({ value: option.id, label: format.text(option.label) }))} />
            </FilterBar>
            <AsyncContent state={defects} empty={<Notice>{text.common.noResults}</Notice>}>
              {(data) => (
                <Stack gap={vars.spacing[4]}>
                  <Grid>
                    <StatCard label={t.pieces} value={format.number(data.pieces)} />
                    <StatCard label={t.absorbed} value={format.money(data.absorbed, data.currency)} highlight />
                    <StatCard label={t.toBrands} value={format.money(data.toBrands, data.currency)} />
                  </Grid>
                  <Table
                    label={t.tabs.defects}
                    columns={[
                      { key: 'date', label: text.common.date },
                      { key: 'product', label: text.owner.fields.product },
                      { key: 'batch', label: text.owner.costing.batch },
                      { key: 'branch', label: text.owner.fields.branch },
                      { key: 'reason', label: text.common.reason },
                      { key: 'qty', label: t.pieces, align: 'end' },
                      { key: 'value', label: t.value, align: 'end' },
                      { key: 'who', label: text.owner.costing.liability },
                      { key: 'status', label: text.common.status },
                    ]}
                    rows={data.rows.map((row) => ({
                      key: row.defect.id,
                      cells: {
                        date: format.date(row.defect.at),
                        product: `${row.productName} · ${format.brand(row.brandId)}`,
                        batch: row.defect.batchId ? <Link to={toPath(routes.owner.batch, { batchId: row.defect.batchId })}>{row.batchNumber}</Link> : '',
                        branch: format.branch(row.defect.branchId),
                        reason: `${format.option(row.defect.reasonId)} · ${t.foundAt[row.defect.foundAt]}`,
                        qty: format.number(row.defect.qty),
                        value: format.money(row.value, data.currency),
                        who: text.owner.costing.liabilities[row.defect.liability],
                        status: <Badge variant={defectStatusTone[row.defect.status]}>{t.statuses[row.defect.status]}</Badge>,
                      },
                    }))}
                  />
                </Stack>
              )}
            </AsyncContent>
          </Stack>
        )}
        {tab === 'writeOffs' && (
          <AsyncContent state={writeOffs} empty={<Notice>{t.noWriteOffs}</Notice>}>
            {(rows) => (
              <Table
                label={t.tabs.writeOffs}
                columns={[
                  { key: 'date', label: text.common.date },
                  { key: 'item', label: text.owner.fields.variant },
                  { key: 'branch', label: text.owner.fields.branch },
                  { key: 'kind', label: t.kind },
                  { key: 'qty', label: t.pieces, align: 'end' },
                  { key: 'value', label: t.value, align: 'end' },
                  { key: 'by', label: text.common.by },
                  { key: 'status', label: text.common.status },
                ]}
                rows={rows.map(({ writeOff, label }) => ({
                  key: writeOff.id,
                  cells: {
                    date: format.dateTime(writeOff.at),
                    item: label,
                    branch: format.branch(writeOff.branchId),
                    kind: `${t.kinds[writeOff.kind]} · ${format.option(writeOff.reasonId)}`,
                    qty: format.number(writeOff.qty),
                    value: format.money(writeOff.unitCost * writeOff.qty, settings.baseCurrency),
                    by: format.user(writeOff.byId),
                    status:
                      writeOff.status === 'pending' ? (
                        <Stack direction="row" gap={vars.spacing[1]}>
                          <Button size="sm" disabled={Boolean(action.busy)} onClick={() => action.run(writeOff.id, () => decideWriteOff(writeOff.id, true))}>
                            {text.common.approve}
                          </Button>
                          <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(writeOff.id, () => decideWriteOff(writeOff.id, false))}>
                            {text.common.reject}
                          </Button>
                        </Stack>
                      ) : (
                        <Badge variant={approvalStateTone[writeOff.status]}>{text.owner.approvals.states[writeOff.status]}</Badge>
                      ),
                  },
                }))}
              />
            )}
          </AsyncContent>
        )}
      </Tabs>
    </Stack>
  );
};
