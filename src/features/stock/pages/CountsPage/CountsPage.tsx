import { BranchCounts } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';

// The storekeeper's stock counts: count one brand or one shelf at a time by scanning, then submit for approval.
export const CountsPage = () => <BranchCounts countPath={(countId) => toPath(routes.storekeeper.count, { countId })} />;
