import { type ReactNode } from 'react';
import { getReferenceData } from '@/shared/api';
import { AsyncContent } from '@/shared/components';
import { ReferenceContext, useAsync, useLiveVersion } from '@/shared/hooks';

// Loads the reference data (branches, brands, people, settings) and reloads it after every change.
// Pages keep showing the last copy while it reloads.
export const ReferenceProvider = ({ children }: { children: ReactNode }) => {
  const version = useLiveVersion();
  const state = useAsync(getReferenceData, [version]);
  const last = state.status === 'success' ? state.data : undefined;
  if (!last && state.status !== 'success') return <AsyncContent state={state}>{() => null}</AsyncContent>;
  return <ReferenceContext value={last ?? null}>{children}</ReferenceContext>;
};
