// How the demo's mock server behaves. To test the error states, set failureRate to e.g. 0.3 (30% of calls fail).
export const mockConfig = {
  delayMs: 250,
  failureRate: 0,
  onlineOrderEveryMs: 120000, // a simulated order from the website (online orders staff); 0 turns it off
  liveSaleEveryMs: 60000, // a simulated checkout in a random branch, to show the dashboard updating live; 0 turns it off
  eReceiptFailureRate: 0.04, // share of simulated sales whose e-receipt fails to send
  cardDeclineRate: 0.1, // share of card payments the simulated card machine declines
  cardMachineDelayMs: 1500, // how long the simulated card machine takes to answer
  databaseVersion: 19, // raise to replace saved demo data with fresh seed data
  seed: 20261105, // the random seed: the same seed always builds the same demo data
  historyDays: 60, // how many days of sales the demo starts with
};
