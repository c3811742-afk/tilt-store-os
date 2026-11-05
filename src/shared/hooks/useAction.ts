import { useState } from 'react';
import { safeAsync } from '@/shared/utils';

// Runs a one-off action (approve, archive, export) with a busy flag and its error, so a button can't be pressed twice.
export const useAction = () => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const run = async <T>(key: string, action: () => Promise<T>) => {
    if (busy) return undefined;
    setBusy(key);
    setError(null);
    const result = await safeAsync(action);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return undefined;
    }
    return result.data;
  };

  return { busy, error, run, clearError: () => setError(null) };
};
