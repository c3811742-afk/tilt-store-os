import { createContext, useContext } from 'react';
import type { SessionUser } from '@/shared/api';

export interface SessionContextValue {
  session: SessionUser | null;
  setSession: (session: SessionUser | null) => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>');
  return context;
};
