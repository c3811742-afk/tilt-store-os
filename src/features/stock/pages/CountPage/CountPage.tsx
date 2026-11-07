import { useParams } from 'react-router';
import { BranchCount } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';

// One stock count: the storekeeper counts and submits it; the branch manager decides.
export const CountPage = () => {
  const { countId = '' } = useParams();
  const { text } = useLocale();
  return <BranchCount countId={countId} back={{ to: routes.storekeeper.counts, label: text.staff.counts.title }} />;
};
