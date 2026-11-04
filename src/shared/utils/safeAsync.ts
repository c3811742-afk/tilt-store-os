export type Result<T> = { ok: true; data: T } | { ok: false; error: unknown };

// Runs an async call and never throws: failures come back as { ok: false } and are logged for developers.
export const safeAsync = async <T>(call: () => Promise<T>): Promise<Result<T>> => {
  try {
    return { ok: true, data: await call() };
  } catch (error) {
    console.error(error);
    return { ok: false, error };
  }
};

// Default "nothing to show" check: no data, or an empty list.
export const isEmptyData = (data: unknown) => data == null || (Array.isArray(data) && data.length === 0);
