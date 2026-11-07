import { getCount } from '@/shared/api';
import { useAsync, useBranchScope, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { withDefaults } from '@/shared/utils';
import { AsyncContent } from '../AsyncContent';
import { Badge } from '../Badge';
import { countStateTone } from '../CountCards';
import { CountReview } from '../CountReview';
import { CountSheet } from '../CountSheet';
import { PageHeader } from '../PageHeader';
import { Stack } from '../Stack';
import { branchCountDefaults } from './BranchCount.defaults';
import type { BranchCountProps } from './BranchCount.types';

// One stock count: counting while it is open, then the review of the differences and, for a branch manager, the
// decision.
export const BranchCount = (props: BranchCountProps) => {
  const { countId, back, canDecide } = withDefaults(branchCountDefaults, props);
  const { text } = useLocale();
  const { branchId } = useBranchScope();
  const version = useLiveVersion();
  const state = useAsync(() => getCount(countId, branchId), [countId, branchId, version]);
  const t = text.staff.counts;

  return (
    <AsyncContent state={state}>
      {(view) => (
        <Stack gap={vars.spacing[5]}>
          <PageHeader
            back={back}
            title={view.count.number}
            actions={
              <>
                {view.count.blind && <Badge>{t.blindTag}</Badge>}
                <Badge variant={countStateTone[view.count.status]}>{t.states[view.count.status]}</Badge>
              </>
            }
          />
          {view.count.status === 'open' ? <CountSheet key={view.count.id} view={view} onSubmitted={state.retry} /> : <CountReview view={view} canDecide={canDecide} />}
        </Stack>
      )}
    </AsyncContent>
  );
};
