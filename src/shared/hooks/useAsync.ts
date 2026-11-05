import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { isEmptyData, safeAsync } from '@/shared/utils';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'empty'; data: T }
  | { status: 'success'; data: T };

export type AsyncResult<T> = AsyncState<T> & { retry: () => void; refreshing: boolean };

// Loads data and tracks loading / error / empty / success. Render the result with <AsyncContent>.
// `deps` works like useEffect's: the call reruns when they change. Once data is shown, a reload (a new sale,
// a payment, another filter) keeps it on screen and swaps in the new values when they arrive, instead of
// replacing the page with the loading screen. A failed reload keeps the last data (and is logged).
export const useAsync = <T>(
  load: () => Promise<T>,
  deps: DependencyList,
  isEmpty: (data: T) => boolean = isEmptyData,
): AsyncResult<T> => {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true; // ignore results that arrive after deps changed or the component unmounted
    setRefreshing(true);
    setState((current) => (current.status === 'success' || current.status === 'empty' ? current : { status: 'loading' }));
    safeAsync(load).then((result) => {
      if (!active) return;
      setRefreshing(false);
      if (!result.ok) setState((current) => (current.status === 'success' || current.status === 'empty' ? current : { status: 'error', error: result.error }));
      else setState({ status: isEmpty(result.data) ? 'empty' : 'success', data: result.data });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reruns on the caller's deps, like useEffect
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { ...state, retry, refreshing };
};
