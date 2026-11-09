import { useState } from 'react';
import { downloadBackup, listBackups, restoreBackup } from '@/shared/api';
import { AsyncContent, Button, Modal, Notice, PageHeader, Stack, Table, Text } from '@/shared/components';
import { backupDefaults } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { downloadBlob, fillText, formatFileSize } from '@/shared/utils';

// The daily backups: download one, or restore it when data was damaged.
export const BackupsPage = () => {
  const { text, locale } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const action = useAction();
  const t = text.it.backups;
  const state = useAsync(listBackups, [version]);
  const [restoring, setRestoring] = useState<{ id: string; day: string } | null>(null);
  const [done, setDone] = useState(false);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <Text variant="caption" color={vars.colors.textMuted}>
        {fillText(t.keep, { days: backupDefaults.keepDays })}
      </Text>
      {done && <Notice tone="success">{t.restored}</Notice>}
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
        {(list) => (
          <Table
            label={t.title}
            stackOnMobile
            columns={[
              { key: 'day', label: t.day },
              { key: 'made', label: t.made },
              { key: 'size', label: t.size, align: 'end' },
              { key: 'actions', label: text.common.actions, align: 'end' },
            ]}
            rows={list.map((backup) => ({
              key: backup.id,
              cells: {
                day: format.date(`${backup.day}T12:00:00`),
                made: format.time(backup.at),
                size: formatFileSize(backup.size, locale),
                actions: (
                  <Stack direction="row" gap={vars.spacing[1]} justify="flex-end">
                    <Button
                      size="sm"
                      variant="muted"
                      disabled={Boolean(action.busy)}
                      onClick={() =>
                        action.run(`get-${backup.id}`, async () => {
                          const file = await downloadBackup(backup.id);
                          downloadBlob(new Blob([file.json], { type: 'application/json' }), file.name);
                        })
                      }
                    >
                      {t.download}
                    </Button>
                    <Button size="sm" variant="muted" disabled={Boolean(action.busy)} onClick={() => setRestoring({ id: backup.id, day: format.date(`${backup.day}T12:00:00`) })}>
                      {t.restore}
                    </Button>
                  </Stack>
                ),
              },
            }))}
          />
        )}
      </AsyncContent>
      <Modal
        open={Boolean(restoring)}
        onClose={() => setRestoring(null)}
        title={t.restoreTitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRestoring(null)}>
              {text.common.cancel}
            </Button>
            <Button
              variant="danger"
              disabled={Boolean(action.busy)}
              onClick={async () => {
                if (!restoring) return;
                if (await action.run('restore', () => restoreBackup(restoring.id))) {
                  setRestoring(null);
                  setDone(true);
                }
              }}
            >
              {t.restore}
            </Button>
          </>
        }
      >
        <Text variant="bodySm">{fillText(t.restoreHint, { day: restoring?.day ?? '' })}</Text>
      </Modal>
    </Stack>
  );
};
