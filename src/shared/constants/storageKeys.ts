import { brand } from './brand';

// Prefixed with the brand id, so two demos on the same domain (github.io) don't share settings.
export const storageKeys = {
  locale: `${brand.id}.locale`,
  appearance: `${brand.id}.appearance`,
  session: `${brand.id}.session`,
  database: `${brand.id}.database`, // the demo's mock data, with every change the user made
  scope: `${brand.id}.scope`, // the branch the owner last looked at
} as const;
