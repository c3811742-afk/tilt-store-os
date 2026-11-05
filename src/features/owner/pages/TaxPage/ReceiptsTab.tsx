import { eReceiptCounts, listEReceipts, resendEReceipt } from '@/shared/api';
import { AsyncContent, Badge, Button, FilterBar, Grid, Notice, SelectField, Stack, StatCard, Table } from '@/shared/components';
import { eReceiptTone } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BranchSelect } from '../../components';

// Which e-receipts went to the tax authority (ETA in Egypt, ZATCA in Saudi Arabia) and which failed, to fix and resend.
export const ReceiptsTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const [status, setStatus] = useQueryState('status', 'failed');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const counts = useAsync(eReceiptCounts, [version]);
  const state = useAsync(() => listEReceipts({ status: status || undefined, branchId: branchId || undefined }), [status, branchId, version]);
  const action = useAction();
  const t = text.owner.tax;

  return (
    <Stack gap={vars.spacing[4]}>
      <AsyncContent state={counts} loading={null}>
        {(data) => (
          <Grid>
            <StatCard label={t.receiptStates.sent} value={format.number(data.sent)} />
            <StatCard label={t.receiptStates.failed} value={format.number(data.failed)} highlight={data.failed > 0} />
            <StatCard label={t.receiptStates.pending} value={format.number(data.pending)} />
          </Grid>
        )}
      </AsyncContent>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <FilterBar>
        <SelectField
          label={text.common.status}
          placeholder={text.common.all}
          value={status}
          onChange={setStatus}
          options={(['sent', 'failed', 'pending'] as const).map((value) => ({ value, label: t.receiptStates[value] }))}
        />
        <BranchSelect allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />
      </FilterBar>
      <AsyncContent state={state} empty={<Notice tone="success">{t.noReceipts}</Notice>}>
        {(rows) => (
          <Table
            label={t.tabs.receipts}
            columns={[
              { key: 'sale', label: t.sale },
              { key: 'branch', label: text.owner.fields.branch },
              { key: 'total', label: text.common.total, align: 'end' },
              { key: 'authority', label: t.authority },
              { key: 'status', label: text.common.status },
              { key: 'actions', label: '', align: 'end' },
            ]}
            rows={rows.map((row) => ({
              key: row.saleId,
              cells: {
                sale: `${row.number} · ${format.dateTime(row.at)}`,
                branch: format.branch(row.branchId),
                total: format.money(row.total, row.currency),
                authority: t.authorities[row.eReceipt.authority],
                status: (
                  <Stack gap={vars.spacing[0]}>
                    <Badge variant={eReceiptTone[row.eReceipt.status]}>{t.receiptStates[row.eReceipt.status]}</Badge>
                    {row.eReceipt.error && <span>{t.receiptErrors[row.eReceipt.error]}</span>}
                  </Stack>
                ),
                actions:
                  row.eReceipt.status === 'failed' ? (
                    <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(row.saleId, () => resendEReceipt(row.saleId))}>
                      {t.resend}
                    </Button>
                  ) : null,
              },
            }))}
          />
        )}
      </AsyncContent>
    </Stack>
  );
};
