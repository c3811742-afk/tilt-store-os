// Small list helpers used by every report.

export const sumBy = <T>(list: readonly T[], value: (item: T) => number) => list.reduce((total, item) => total + value(item), 0);

export const groupBy = <T, K extends string>(list: readonly T[], key: (item: T) => K) => {
  const groups = new Map<K, T[]>();
  list.forEach((item) => {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  });
  return groups;
};

export const indexBy = <T extends { id: string }>(list: readonly T[]) => new Map(list.map((item) => [item.id, item]));

export const unique = <T>(list: readonly T[]) => [...new Set(list)];

export const sortBy = <T>(list: readonly T[], value: (item: T) => number | string, direction: 'asc' | 'desc' = 'asc') => {
  const sign = direction === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sign;
  });
};

// A share of a total as a percent; 0 when the total is 0.
export const percentOf = (part: number, total: number) => (total ? (part / total) * 100 : 0);

// The change from `previous` to `current` as a percent; null when there was nothing before.
export const changePercent = (current: number, previous: number) => (previous ? ((current - previous) / Math.abs(previous)) * 100 : null);

// Rounds money to 2 decimals without floating-point leftovers.
export const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

// Case- and accent-insensitive text search over several fields.
export const matchesText = (query: string, ...fields: (string | undefined)[]) => {
  const needle = query.trim().toLowerCase();
  return !needle || fields.some((field) => field?.toLowerCase().includes(needle));
};

// A stock search: every word has to match the product name, SKU or barcode, the exact size ("XL") or the colour
// ("black"), so "hoodie black xl" finds that piece.
export const matchesVariant = (query: string, item: { name: string; sku: string; barcode: string; size: string; color: string }) =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => item.name.toLowerCase().includes(word) || item.sku.toLowerCase().includes(word) || item.barcode.includes(word) || item.size.toLowerCase() === word || item.color.toLowerCase().includes(word));
