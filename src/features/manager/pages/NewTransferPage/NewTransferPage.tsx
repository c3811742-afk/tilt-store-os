import { useNavigate } from 'react-router';
import { PageHeader, Stack, TransferForm } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// A branch manager asks another branch or the warehouse for items.
export const NewTransferPage = () => {
  const { text } = useLocale();
  const navigate = useNavigate();
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader back={{ to: routes.manager.transfers, label: text.nav.transfers }} title={text.staff.transfers.requestTitle} />
      <TransferForm mode="request" onCancel={() => navigate(routes.manager.transfers)} onCreated={(transfer) => navigate(toPath(routes.manager.transfer, { transferId: transfer.id }))} />
    </Stack>
  );
};
