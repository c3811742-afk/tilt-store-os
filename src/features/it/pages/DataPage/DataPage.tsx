import { useState } from 'react';
import { fixRecord, getTable, listTables, type TableInfo } from '@/shared/api';
import { AsyncContent, Button, Card, Modal, Notice, PageHeader, SearchBox, Stack, Table, Text, TextAreaField } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import styles from './DataPage.module.css';

// Every table of the data. Open a record to check it; fix it (with a reason, logged) when a bug damaged it.
export const DataPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const t = text.it.data;
  const [table, setTable] = useQueryState<TableInfo['name'] | ''>('table', '');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<{ key: string; json: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const tables = useAsync(listTables, [version]);
  const rows = useAsync(() => (table ? getTable(table, query, page) : Promise.resolve(null)), [table, query, page, version]);
  const name = (key: TableInfo['name']) => t.names[key] ?? key;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      {saved && <Notice tone="success">{t.saved}</Notice>}
      <div className={styles.layout}>
        <Card title={t.tables}>
          <AsyncContent state={tables}>
            {(list) => (
              <ul className={styles.tables}>
                {list.map((info) => (
                  <li key={info.name}>
                    <button
                      type="button"
                      className={styles.table}
                      aria-current={info.name === table}
                      onClick={() => {
                        setTable(info.name);
                        setQuery('');
                        setPage(0);
                        setSaved(false);
                      }}
                    >
                      <span>{name(info.name)}</span>
                      <span className={styles.count}>{format.number(info.rows)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AsyncContent>
        </Card>
        <Stack gap={vars.spacing[3]}>
          {table ? (
            <>
              <Text as="h2" variant="h3">
                {name(table)}
              </Text>
              <SearchBox label={t.search} placeholder={t.search} value={query} onChange={(value) => { setQuery(value); setPage(0); }} onSubmit={() => undefined} width="100%" />
              <AsyncContent state={rows}>
                {(result) =>
                  result && (
                    <Stack gap={vars.spacing[3]}>
                      <Table
                        filterable={false} // the search box looks through every field
                        label={name(table)}
                        emptyText={t.empty}
                        columns={[
                          { key: 'id', label: t.id },
                          { key: 'preview', label: text.common.details },
                          { key: 'open', label: text.common.actions, align: 'end' },
                        ]}
                        rows={result.rows.map((row) => ({
                          key: row.key,
                          cells: {
                            id: <code className={styles.code}>{row.key}</code>,
                            preview: <span className={styles.preview}>{row.json.replace(/\s+/g, ' ').slice(0, 140)}</span>,
                            open: (
                              <Button size="sm" variant="muted" onClick={() => { setOpen(row); setDraft(row.json); setReason(''); action.clearError(); }}>
                                {t.open}
                              </Button>
                            ),
                          },
                        }))}
                      />
                      {result.total > result.pageSize && (
                        <Stack direction="row" align="center" gap={vars.spacing[3]}>
                          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
                            {t.previous}
                          </Button>
                          <Text as="span" variant="caption" color={vars.colors.textMuted}>
                            {fillText(t.page, { page: page + 1, pages: Math.ceil(result.total / result.pageSize) })}
                          </Text>
                          <Button size="sm" variant="secondary" disabled={(page + 1) * result.pageSize >= result.total} onClick={() => setPage(page + 1)}>
                            {t.next}
                          </Button>
                        </Stack>
                      )}
                    </Stack>
                  )
                }
              </AsyncContent>
            </>
          ) : (
            <Notice>{t.pickTable}</Notice>
          )}
        </Stack>
      </div>
      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? fillText(t.record, { id: open.key }) : ''}
        width={vars.sizes.modal.wide}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(null)}>
              {text.common.cancel}
            </Button>
            <Button
              disabled={Boolean(action.busy) || draft === open?.json || !reason.trim()}
              onClick={async () => {
                if (!open || !table) return;
                if (await action.run('fix', () => fixRecord(table, open.key, draft, reason))) {
                  setOpen(null);
                  setSaved(true);
                }
              }}
            >
              {t.save}
            </Button>
          </>
        }
      >
        <Stack gap={vars.spacing[3]}>
          {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
          <TextAreaField label={t.fix} rows={16} value={draft} onChange={setDraft} width="100%" />
          <TextAreaField label={t.reason} rows={2} value={reason} onChange={setReason} required width="100%" />
        </Stack>
      </Modal>
    </Stack>
  );
};
