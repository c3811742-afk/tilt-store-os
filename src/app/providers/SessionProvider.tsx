import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSession, type SessionUser } from '@/shared/api';
import { LoadingState } from '@/shared/components';
import { SessionContext } from '@/shared/hooks';
import { safeAsync } from '@/shared/utils';

// Holds the signed-in user. Until it is known, shows the loading screen.
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    safeAsync(getSession).then((result) => setSession(result.ok ? result.data : null));
  }, []);

  const value = useMemo(() => ({ session: session ?? null, setSession }), [session]);
  if (session === undefined) return <LoadingState />;
  return <SessionContext value={value}>{children}</SessionContext>;
};
