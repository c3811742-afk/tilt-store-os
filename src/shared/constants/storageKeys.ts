import { brand } from './brand';

// Prefixed with the brand id, so two demos on the same domain (github.io) don't share settings.
export const storageKeys = {
  locale: `${brand.id}.locale`,
  appearance: `${brand.id}.appearance`,
  session: `${brand.id}.session`,
  database: `${brand.id}.database`, // the demo's mock data, with every change the user made
  scope: `${brand.id}.scope`, // the branch the owner last looked at
  branch: `${brand.id}.branch`, // the branch a staff member is working in on this device
  connection: `${brand.id}.connection`, // offline mode and the changes waiting to sync
  errorLog: `${brand.id}.errorLog`, // errors caught in this browser, for the IT admin
  backups: `${brand.id}.backups`, // the daily backups of the demo data
  cart: `${brand.id}.cart`, // a cashier's current sale on this device, per person and branch (keeps it while moving between pages)
} as const;
