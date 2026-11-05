// How the demo's mock server behaves. To test the error states, set failureRate to e.g. 0.3 (30% of calls fail).
export const mockConfig = {
  delayMs: 250,
  failureRate: 0,
  liveSaleEveryMs: 60000, // a simulated checkout in a random branch, to show the dashboard updating live; 0 turns it off
  eReceiptFailureRate: 0.04, // share of simulated sales whose e-receipt fails to send
  databaseVersion: 1, // raise to replace saved demo data with fresh seed data
  seed: 20261105, // the random seed: the same seed always builds the same demo data
  historyDays: 60, // how many days of sales the demo starts with
};
