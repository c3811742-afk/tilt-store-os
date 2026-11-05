import { useState } from 'react';
import { getTaxSetup, registerDevice, saveDevice } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Grid, Notice, Stack, Table, Text, TextField } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BranchSelect } from '../../components';

// Each till device and its registration with the tax authority of its branch's country.
export const DevicesTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(getTaxSetup, [version]);
  const action = useAction();
  const [draft, setDraft] = useState({ branchId: '', name: '', serial: '' });
  const t = text.owner.tax;

  return (
    <AsyncContent state={state}>
      {(data) => (
        <Stack gap={vars.spacing[4]}>
          {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
          <Card title={t.addDevice}>
            <Grid minColumnWidth={vars.sizes.field.narrow}>
              <BranchSelect value={draft.branchId} onChange={(branchId) => setDraft({ ...draft, branchId })} allLabel="" />
              <TextField label={text.common.name} value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
              <TextField label={t.serial} value={draft.serial} onChange={(serial) => setDraft({ ...draft, serial })} />
            </Grid>
            <Stack direction="row" justify="flex-end">
              <Button
                disabled={!draft.branchId || !draft.name.trim() || !draft.serial.trim() || Boolean(action.busy)}
                onClick={async () => {
                  if (await action.run('add', () => saveDevice(draft))) setDraft({ branchId: '', name: '', serial: '' });
                }}
              >
                {t.addDevice}
              </Button>
            </Stack>
          </Card>
          <Table
            label={t.tabs.devices}
            columns={[
              { key: 'device', label: t.device },
              { key: 'branch', label: text.owner.fields.branch },
              { key: 'status', label: text.common.status },
              { key: 'actions', label: '', align: 'end' },
            ]}
            rows={data.devices.map((device) => ({
              key: device.id,
              cells: {
                device: (
                  <Stack gap={vars.spacing[0]}>
                    <Text as="span">{device.name}</Text>
                    <Text as="span" variant="caption" color={vars.colors.textMuted}>
                      {device.serial}
                    </Text>
                  </Stack>
                ),
                branch: format.branch(device.branchId),
                status:
                  device.registration.status === 'registered' ? (
                    <Badge variant="success">{`${t.registered} · ${device.registration.authorityId ?? ''}`}</Badge>
                  ) : (
                    <Badge variant="warning">{t.notRegistered}</Badge>
                  ),
                actions:
                  device.registration.status !== 'registered' ? (
                    <Button size="sm" disabled={Boolean(action.busy)} onClick={() => action.run(device.id, () => registerDevice(device.id))}>
                      {t.register}
                    </Button>
                  ) : null,
              },
            }))}
          />
        </Stack>
      )}
    </AsyncContent>
  );
};
