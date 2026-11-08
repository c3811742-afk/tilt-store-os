import { Badge } from '@/shared/components';
import { useLocale } from '@/shared/hooks';

// An online order's payment status: "Paid" or "Not paid" (cash on delivery until the courier collects it).
export const PaymentChip = ({ paid }: { paid: boolean }) => {
  const { text } = useLocale();
  return <Badge variant={paid ? 'success' : 'warning'}>{paid ? text.online.orders.paid : text.online.orders.unpaid}</Badge>;
};
