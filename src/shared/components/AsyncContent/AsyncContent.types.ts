import type { ReactNode } from 'react';
import type { AsyncResult } from '@/shared/hooks';

export interface AsyncContentProps<T> {
  state: AsyncResult<T>; // the value returned by useAsync
  children: (data: T) => ReactNode; // rendered on success
  loading?: ReactNode; // replace the default LoadingState
  error?: ReactNode; // replace the default ErrorState (with "Try again")
  empty?: ReactNode; // replace the default EmptyState
}
