import { brand } from './brand';

// Prefixed with the brand id, so two demos on the same domain (github.io) don't share settings.
export const storageKeys = {
  locale: `${brand.id}.locale`,
  appearance: `${brand.id}.appearance`,
} as const;
