import { useNavigate } from 'react-router';
import { listReceivings } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, PageHeader, Stack, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// Brand deliveries received in the storekeeper's branch or warehouse, the ones still being counted first.
export const ReceivingListPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const state = useAsync(() => listReceivings(branchId), [branchId, version]);
  const t = text.storekeeper.receiving;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} actions={<Button onClick={() => navigate(routes.storekeeper.newReceiving)}>{t.new}</Button>} />
      <AsyncContent state={state} empty={<Notice>{t.none}</Notice>}>
        {(views) => (
          <Stack gap={vars.spacing[3]}>
            {[...views]
              .sort((a, b) => Number(a.receiving.status === 'confirmed') - Number(b.receiving.status === 'confirmed'))
              .map(({ receiving, lines }) => {
                const status = receiving.status ?? 'confirmed';
                return (
                  <Card
                    key={receiving.id}
                    to={toPath(routes.storekeeper.receivingRecord, { receivingId: receiving.id })}
                    title={`${receiving.number} · ${format.brand(receiving.brandId)}`}
                    actions={
                      <>
                        {receiving.consignment && <Badge variant="info">{t.consignment}</Badge>}
                        <Badge variant={status === 'draft' ? 'warning' : 'success'}>{t.states[status]}</Badge>
                      </>
                    }
                  >
                    <Text variant="caption" color={vars.colors.textMuted}>
                      {fillText(t.summary, { lines: format.number(lines.length), pieces: format.number(lines.reduce((sum, line) => sum + line.received, 0)), user: format.user(receiving.byId), date: format.dateTime(receiving.at) })}
                    </Text>
                  </Card>
                );
              })}
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
