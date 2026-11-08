import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

// A value kept in the page's address (?tab=aging), so a link or a reload opens the same view.
// The value updates on screen straight away (a search box never loses a typed letter) and the address follows.
// When the address changes from outside (a link, the back button), the value follows it.
export const useQueryState = <T extends string = string>(key: string, fallback: NoInfer<T>) => {
  const [params, setParams] = useSearchParams();
  const fromAddress = (params.get(key) as T | null) ?? fallback;
  const [value, setLocal] = useState<T>(fromAddress);
  const written = useRef<T[]>([]); // values this hook wrote that the address hasn't shown yet

  useEffect(() => {
    const index = written.current.indexOf(fromAddress);
    if (index >= 0) {
      written.current = written.current.slice(index + 1); // our own write caught up
      return;
    }
    written.current = [];
    setLocal(fromAddress);
  }, [fromAddress]);

  const setValue = (next: T) => {
    setLocal(next);
    written.current.push(next);
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next === fallback) updated.delete(key);
        else updated.set(key, next);
        return updated;
      },
      { replace: true },
    );
  };
  return [value, setValue] as const;
};
