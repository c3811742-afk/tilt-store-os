import { useParams } from 'react-router';
import { getReceiving } from '@/shared/api';
import { AsyncContent, Badge, PageHeader, Stack } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAsync, useBranchScope, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { ReceivingDraft } from './ReceivingDraft';
import { ReceivingRecord } from './ReceivingRecord';

// One brand delivery: counted and signed while it is a draft, then the confirmed record with its note and labels.
export const ReceivingPage = () => {
  const { receivingId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const state = useAsync(() => getReceiving(receivingId, branchId), [receivingId, branchId, version]);
  const t = text.storekeeper.receiving;

  return (
    <AsyncContent state={state}>
      {(view) => {
        const status = view.receiving.status ?? 'confirmed';
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: routes.storekeeper.receiving, label: t.title }}
              title={`${view.receiving.number} · ${format.brand(view.receiving.brandId)}`}
              actions={
                <>
                  {view.receiving.consignment && <Badge variant="info">{t.consignment}</Badge>}
                  <Badge variant={status === 'draft' ? 'warning' : 'success'}>{t.states[status]}</Badge>
                </>
              }
            />
            {status === 'draft' ? <ReceivingDraft key={view.receiving.id} view={view} onConfirmed={state.retry} /> : <ReceivingRecord view={view} />}
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
