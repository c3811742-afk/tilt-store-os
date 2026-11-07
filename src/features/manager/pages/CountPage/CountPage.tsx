import { useParams } from 'react-router';
import { BranchCount } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';

// One stock count, which the branch manager reviews and decides.
export const CountPage = () => {
  const { countId = '' } = useParams();
  const { text } = useLocale();
  return <BranchCount countId={countId} canDecide back={{ to: routes.manager.counts, label: text.staff.counts.title }} />;
};
