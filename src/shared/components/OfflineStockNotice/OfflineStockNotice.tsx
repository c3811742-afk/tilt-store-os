import { useConnection, useLocale } from '@/shared/hooks';
import { Notice } from '../Notice';

// While offline, on every screen with stock numbers: they may not be up to date (other branches' sales and moves
// arrive when the connection is back). Nothing is shown when online.
export const OfflineStockNotice = () => {
  const { offline } = useConnection();
  const { text } = useLocale();
  return offline ? <Notice tone="warning">{text.shell.stockWarning}</Notice> : null;
};
