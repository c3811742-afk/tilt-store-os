import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';
import { LoadingState } from '../LoadingState';
import type { AsyncContentProps } from './AsyncContent.types';

// Renders the right state for a useAsync result:
// <AsyncContent state={items}>{(data) => <ItemGrid items={data} />}</AsyncContent>
export const AsyncContent = <T,>({ state, children, loading, error, empty }: AsyncContentProps<T>) => {
  switch (state.status) {
    case 'loading':
      return loading ?? <LoadingState />;
    case 'error':
      return error ?? <ErrorState onRetry={state.retry} />;
    case 'empty':
      return empty ?? <EmptyState />;
    case 'success':
      return children(state.data);
  }
};
