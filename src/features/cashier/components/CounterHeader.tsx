import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button, PageHeader } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';
import { fillText, formatTime } from '@/shared/utils';

// The counter's heading: the screen's name, the shift as a line under it (the branch is in the top bar and the
// cashier's name on the account button), with Find receipt and Exchange.
export const CounterHeader = ({ shiftOpenedAt, actions }: { shiftOpenedAt?: string; actions?: ReactNode }) => {
  const { text, locale } = useLocale();
  const navigate = useNavigate();
  const subtitle = shiftOpenedAt ? fillText(text.cashier.heading, { time: formatTime(shiftOpenedAt, locale) }) : text.cashier.headingClosed;
  return (
    <PageHeader
      title={text.nav.sell}
      subtitle={subtitle}
      actions={
        actions ?? (
          <>
            <Button variant="secondary" onClick={() => navigate(routes.cashier.receipts)}>
              {text.cashier.findReceipt}
            </Button>
            <Button variant="secondary" onClick={() => navigate(routes.cashier.returns)}>
              {text.cashier.exchange}
            </Button>
          </>
        )
      }
    />
  );
};
