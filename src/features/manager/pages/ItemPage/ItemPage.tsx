import { useParams } from 'react-router';
import { BranchItemHistory } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';

// One item in the manager's branch: where its pieces are, other branches' quantities and its movement history.
export const ItemPage = () => {
  const { variantId = '' } = useParams();
  const { text } = useLocale();
  return <BranchItemHistory variantId={variantId} back={{ to: routes.manager.stock, label: text.manager.stock.title }} />;
};
