import { useState } from 'react';
import { listBranchDefects, listBranchWriteOffs, markDefectToReturn } from '@/shared/api';
import { approvalStateTone, defectStatusTone } from '@/shared/constants';
import { useAction, useAsync, useBranchScope, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { withDefaults } from '@/shared/utils';
import { AsyncContent } from '../AsyncContent';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { Notice } from '../Notice';
import { PageHeader } from '../PageHeader';
import { ReportDefectModal } from '../ReportDefectModal';
import { Stack } from '../Stack';
import { Table } from '../Table';
import { Tabs } from '../Tabs';
import { Text } from '../Text';
import { WriteOffModal } from '../WriteOffModal';
import { branchDefectsDefaults } from './BranchDefects.defaults';
import type { BranchDefectsProps } from './BranchDefects.types';

type DefectsTab = 'defects' | 'writeOffs';

// The branch's defects and write-offs, as a whole page: report a defect, set defective pieces aside for the brand, and
// ask to write off lost stock. Quantities and reasons only, no cost. The two actions sit in the page header (top right),
// with Report a defect as the main one.
export const BranchDefects = (props: BranchDefectsProps) => {
  const { foundAtOptions, showLiability, showPhotos, title, subtitle, children } = withDefaults(branchDefectsDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const action = useAction();
  const [tab, setTab] = useQueryState<DefectsTab>('tab', 'defects');
  const [open, setOpen] = useState<'report' | 'writeOff' | null>(null);
  const [done, setDone] = useState('');
  const defects = useAsync(() => listBranchDefects(branchId), [branchId, version]);
  const writeOffs = useAsync(() => listBranchWriteOffs(branchId), [branchId, version]);
  const t = text.staff.defects;

  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
  };

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={title ?? t.title}
        subtitle={subtitle ?? t.subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen('writeOff')}>
              {t.writeOff}
            </Button>
            <Button onClick={() => setOpen('report')}>
              <Icon name="plus" />
              {t.report}
            </Button>
          </>
        }
      />
      {children}
      {done && <Notice tone="success">{done}</Notice>}
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Tabs<DefectsTab> label={t.title} value={tab} onChange={setTab} tabs={(['defects', 'writeOffs'] as const).map((value) => ({ value, label: t.tabs[value] }))}>
        {tab === 'defects' && (
          <AsyncContent state={defects} empty={<Notice>{t.none}</Notice>}>
            {(rows) => (
              <Table
                label={t.tabs.defects}
                stackOnMobile
                columns={[
                  { key: 'when', label: text.common.when },
                  { key: 'item', label: t.item },
                  { key: 'qty', label: text.common.quantity, align: 'end' },
                  { key: 'reason', label: t.defectType },
                  { key: 'found', label: t.foundAt },
                  ...(showLiability ? [{ key: 'pays', label: t.whoPays }] : []),
                  { key: 'status', label: text.common.status },
                  { key: 'action', label: <span aria-hidden /> },
                ]}
                rows={rows.map((row) => ({
                  key: row.id,
                  values: { when: row.at },
                  cells: {
                    when: format.dateTime(row.at),
                    item: (
                      <Stack gap={vars.spacing[0]}>
                        <Text as="span" variant="bodySm" autoDirection>
                          {row.productName}
                        </Text>
                        <Text as="span" variant="caption" color={vars.colors.textMuted}>
                          {[row.size, row.color, format.brand(row.brandId), row.batchNumber, row.note, row.photos.length ? `${t.photos} ${format.number(row.photos.length)}` : undefined].filter(Boolean).join(' · ')}
                        </Text>
                      </Stack>
                    ),
                    qty: format.number(row.qty),
                    reason: format.option(row.reasonId),
                    found: text.owner.defects.foundAt[row.foundAt],
                    pays: t.liability[row.liability],
                    status: row.toReturn && row.status === 'open' ? <Badge variant="warning">{t.toReturn}</Badge> : <Badge variant={defectStatusTone[row.status]}>{text.owner.defects.statuses[row.status]}</Badge>,
                    action:
                      row.status === 'open' && !row.toReturn ? (
                        <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(row.id, () => markDefectToReturn(row.id))}>
                          {t.markToReturn}
                        </Button>
                      ) : (
                        ''
                      ),
                  },
                }))}
              />
            )}
          </AsyncContent>
        )}
        {tab === 'writeOffs' && (
          <AsyncContent state={writeOffs} empty={<Notice>{t.noWriteOffs}</Notice>}>
            {(rows) => (
              <Table
                label={t.tabs.writeOffs}
                stackOnMobile
                columns={[
                  { key: 'when', label: text.common.when },
                  { key: 'item', label: t.item },
                  { key: 'qty', label: text.common.quantity, align: 'end' },
                  { key: 'reason', label: t.reason },
                  { key: 'by', label: text.common.by },
                  { key: 'status', label: text.common.status },
                ]}
                rows={rows.map(({ writeOff, productName, size, color }) => ({
                  key: writeOff.id,
                  values: { when: writeOff.at },
                  cells: {
                    when: format.dateTime(writeOff.at),
                    item: `${productName} · ${size} · ${color}`,
                    qty: format.number(writeOff.qty),
                    reason: format.option(writeOff.reasonId),
                    by: format.user(writeOff.byId),
                    status: <Badge variant={approvalStateTone[writeOff.status]}>{text.owner.approvals.states[writeOff.status]}</Badge>,
                  },
                }))}
              />
            )}
          </AsyncContent>
        )}
      </Tabs>
      {open === 'report' && <ReportDefectModal open foundAtOptions={foundAtOptions} showLiability={showLiability} showPhotos={showPhotos} onClose={() => setOpen(null)} onDone={() => finish(t.reported)} />}
      {open === 'writeOff' && <WriteOffModal open onClose={() => setOpen(null)} onDone={() => finish(t.requested)} />}
    </Stack>
  );
};
