import { useParams } from 'react-router';
import { BranchItemHistory } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';
import { ItemActions } from './ItemActions';

// One item in the storekeeper's branch: where its pieces are, other branches and online, its full history, and the
// storekeeper's actions on it.
export const ItemPage = () => {
  const { variantId = '' } = useParams();
  const { text } = useLocale();
  return <BranchItemHistory variantId={variantId} back={{ to: routes.storekeeper.stock, label: text.storekeeper.stock.title }} actions={(data) => <ItemActions data={data} />} />;
};
