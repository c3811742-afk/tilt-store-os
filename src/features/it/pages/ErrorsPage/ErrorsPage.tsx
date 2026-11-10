import { clearErrors, listErrors } from '@/shared/api';
import { AsyncContent, Button, Notice, PageHeader, Stack, Table } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import styles from '../DataPage/DataPage.module.css';

// Errors that happened in the system, newest first, to find and investigate bugs.
export const ErrorsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const action = useAction();
  const t = text.it.errors;
  const state = useAsync(listErrors, [version]);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        actions={
          <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('clear', clearErrors)}>
            {t.clear}
          </Button>
        }
      />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice tone="success">{t.empty}</Notice>}>
        {(entries) => (
          <Table
            label={t.title}
            stackOnMobile
            columns={[
              { key: 'when', label: t.when },
              { key: 'page', label: t.page },
              { key: 'person', label: t.person },
              { key: 'message', label: t.message },
            ]}
            rows={entries.map((entry) => ({
              key: entry.id,
              values: { when: entry.at },
              cells: {
                when: format.dateTime(entry.at),
                page: <code className={styles.code}>{entry.page}</code>,
                person: entry.userName || t.noOne,
                message: <span className={styles.preview}>{entry.message.slice(0, 400)}</span>,
              },
            }))}
          />
        )}
      </AsyncContent>
    </Stack>
  );
};
