import { BranchCounts } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';

// The branch manager's stock counts: blind counts allowed, submitted counts first.
export const CountsPage = () => <BranchCounts allowBlind initialTab="pending" countPath={(countId) => toPath(routes.manager.count, { countId })} />;
