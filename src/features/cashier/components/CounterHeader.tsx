import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button, PageHeader } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale, useSession, useWorkBranch } from '@/shared/hooks';
import { fillText, formatTime } from '@/shared/utils';

// The counter's heading, as on the mood board: "Park Mall / Shift open 10:02 / Salma", with Find receipt and Exchange.
export const CounterHeader = ({ shiftOpenedAt, actions }: { shiftOpenedAt?: string; actions?: ReactNode }) => {
  const { text, locale } = useLocale();
  const { session } = useSession();
  const { branch } = useWorkBranch();
  const navigate = useNavigate();
  const name = session?.user.name.split(' ')[0] ?? '';
  const title = shiftOpenedAt
    ? fillText(text.cashier.heading, { branch: branch?.name ?? '', time: formatTime(shiftOpenedAt, locale), name })
    : fillText(text.cashier.headingClosed, { branch: branch?.name ?? '', name });
  return (
    <PageHeader
      title={title}
      actions={
        actions ?? (
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate(routes.cashier.receipts)}>
              {text.cashier.findReceipt}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate(routes.cashier.returns)}>
              {text.cashier.exchange}
            </Button>
          </>
        )
      }
    />
  );
};
