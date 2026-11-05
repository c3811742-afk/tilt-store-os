import { useSearchParams } from 'react-router';

// A value kept in the page's address (?tab=aging), so a link or a reload opens the same view.
export const useQueryState = <T extends string = string>(key: string, fallback: NoInfer<T>) => {
  const [params, setParams] = useSearchParams();
  const value = (params.get(key) as T | null) ?? fallback;
  const setValue = (next: T) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next === fallback) updated.delete(key);
        else updated.set(key, next);
        return updated;
      },
      { replace: true },
    );
  return [value, setValue] as const;
};
