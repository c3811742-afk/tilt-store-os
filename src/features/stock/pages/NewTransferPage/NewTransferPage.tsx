import { useNavigate } from 'react-router';
import { PageHeader, Stack, TransferForm } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// A storekeeper asks another branch or the warehouse for items, or prepares a transfer (a dispatch) from their own
// branch or the warehouse: the quantity of each product and where it goes.
export const NewTransferPage = () => {
  const { text } = useLocale();
  const navigate = useNavigate();
  const [mode] = useQueryState<'request' | 'send'>('mode', 'send');
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader back={{ to: routes.storekeeper.transfers, label: text.nav.transfers }} title={mode === 'request' ? text.staff.transfers.requestTitle : text.storekeeper.transfers.sendTitle} />
      <TransferForm key={mode} mode={mode} onCancel={() => navigate(routes.storekeeper.transfers)} onCreated={(transfer) => navigate(toPath(routes.storekeeper.transfer, { transferId: transfer.id }))} />
    </Stack>
  );
};
