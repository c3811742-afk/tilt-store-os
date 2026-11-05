import { useState } from 'react';
import { listActivity, setFlagRules } from '@/shared/api';
import { AsyncContent, Badge, Card, Checkbox, FilterBar, Grid, Notice, PageHeader, SelectField, Stack, Table, Tabs, Text, TextField, Button } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import type { ActivityAction, FlagRules } from '@/shared/types';
import { vars } from '@/shared/theme';
import { BranchSelect, PeriodFilter } from '../../components';
import { usePeriod } from '../../hooks';

type ActivityTab = 'log' | 'flags';
const actions: ActivityAction[] = ['create', 'update', 'archive', 'restore', 'delete', 'approve', 'reject', 'priceChange', 'costChange', 'discount', 'refund', 'void', 'writeOff', 'stockAdjust', 'cashDifference', 'pay', 'lock', 'signIn', 'export', 'send'];
const flagToggles = ['priceChanges', 'costChanges', 'writeOffs', 'cashDifferences', 'stockAdjustments', 'voids'] as const;

// Who did what, when and where, with old and new values. Flagged actions are the ones the owners chose to watch.
// Completed sales are never edited: they are reversed with a record (a void or a return), which shows here.
export const ActivityPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { users, settings } = useReference();
  const errorMessage = useErrorMessage();
  const period = usePeriod('last30');
  const [tab, setTab] = useQueryState<ActivityTab>('tab', 'log');
  const [userId, setUserId] = useQueryState('user', '');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [actionFilter, setActionFilter] = useQueryState('action', '');
  const [flagged, setFlagged] = useQueryState('flagged', '1');
  const version = useLiveVersion();
  const state = useAsync(() => listActivity({ range: period.range, userId: userId || undefined, branchId: branchId || undefined, action: (actionFilter || undefined) as ActivityAction | undefined, flaggedOnly: flagged === '1' }), [period.range.from, period.range.to, userId, branchId, actionFilter, flagged, version]);
  const action = useAction();
  const [rules, setRules] = useState<FlagRules | null>(null);
  const t = text.owner.activity;
  const current = rules ?? settings.flagRules;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Notice>{t.salesNote}</Notice>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Tabs<ActivityTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'log', label: t.tabs.log },
          { value: 'flags', label: t.tabs.flags },
        ]}
      >
        {tab === 'log' && (
          <Stack gap={vars.spacing[4]}>
            <PeriodFilter period={period} />
            <FilterBar>
              <SelectField label={t.user} placeholder={text.owner.fields.allStaff} value={userId} onChange={setUserId} options={users.map((user) => ({ value: user.id, label: user.name }))} />
              <BranchSelect kinds={['store', 'online', 'warehouse']} allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />
              <SelectField label={t.action} placeholder={text.common.all} value={actionFilter} onChange={setActionFilter} options={actions.map((value) => ({ value, label: t.actions[value] }))} />
            </FilterBar>
            <Checkbox label={t.flaggedOnly} checked={flagged === '1'} onChange={(checked) => setFlagged(checked ? '1' : '')} />
            <AsyncContent state={state} empty={<Notice>{text.common.noResults}</Notice>}>
              {(data) =>
                data.rows.length === 0 ? (
                  <Notice>{text.common.noResults}</Notice>
                ) : (
                  <Table
                    label={t.title}
                    columns={[
                      { key: 'when', label: text.common.when },
                      { key: 'who', label: t.user },
                      { key: 'what', label: t.action },
                      { key: 'target', label: t.target },
                      { key: 'changes', label: t.changes },
                    ]}
                    rows={data.rows.map((entry) => ({
                      key: entry.id,
                      cells: {
                        when: format.dateTime(entry.at),
                        who: `${format.user(entry.userId)}${entry.branchId ? ` · ${format.branch(entry.branchId)}` : ''}`,
                        what: (
                          <Stack direction="row" gap={vars.spacing[1]} wrap>
                            {t.actions[entry.action]}
                            {entry.flagged && <Badge variant="warning">{t.flagged}</Badge>}
                          </Stack>
                        ),
                        target: `${t.targets[entry.target.type]}: ${entry.target.label}`,
                        changes: (
                          <Stack gap={vars.spacing[0]}>
                            {(entry.changes ?? []).map((change) => (
                              <Text key={change.field} as="span" variant="caption">
                                {`${change.field}: ${change.from ?? '—'} → ${change.to ?? '—'}`}
                              </Text>
                            ))}
                            {entry.amount !== undefined && entry.currency && <Text as="span" variant="caption">{format.money(entry.amount, entry.currency)}</Text>}
                          </Stack>
                        ),
                      },
                    }))}
                  />
                )
              }
            </AsyncContent>
          </Stack>
        )}
        {tab === 'flags' && (
          <Card
            title={t.tabs.flags}
            actions={
              <Button size="sm" disabled={!rules || Boolean(action.busy)} onClick={async () => { if (rules && (await action.run('rules', () => setFlagRules(rules)))) setRules(null); }}>
                {text.common.saveChanges}
              </Button>
            }
          >
            <Text variant="bodySm" color={vars.colors.textMuted}>
              {t.flagsHint}
            </Text>
            <Grid minColumnWidth={vars.sizes.field.narrow}>
              <TextField label={t.flagDiscountAbove} type="number" min={0} max={100} prefix="%" value={String(current.discountAbovePercent)} onChange={(value) => setRules({ ...current, discountAbovePercent: Number(value) || 0 })} />
              <TextField label={t.flagRefundAbove} type="number" min={0} prefix={settings.baseCurrency} value={String(current.refundAbove)} onChange={(value) => setRules({ ...current, refundAbove: Number(value) || 0 })} />
            </Grid>
            {flagToggles.map((key) => (
              <Checkbox key={key} label={t.flagRules[key]} checked={current[key]} onChange={(checked) => setRules({ ...current, [key]: checked })} />
            ))}
          </Card>
        )}
      </Tabs>
    </Stack>
  );
};
