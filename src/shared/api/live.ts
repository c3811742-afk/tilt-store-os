import { mockConfig } from '@/shared/constants';
import { createRandom, nowIso } from '@/shared/utils';
import { availableIn, recordSale } from './engine';
import { db, mutate, newId, nextNumber, notify } from './server';
import { checkStockAlerts } from './stockAlerts';
import { startOnlineOrderFeed } from './onlineOrders';

const maxTries = 30;

// A checkout in a random store, as if a cashier just finished a sale. Only for the demo, so the
// dashboard visibly updates live; the cashier screens will record real sales through the same recordSale.
const simulateSale = () =>
  mutate(() => {
    const random = createRandom(Date.now());
    const stores = db.branches.filter((branch) => branch.kind === 'store' && !branch.archived);
    const branch = random.pick(stores);
    if (!branch) return null;
    const cashiers = db.users.filter((user) => user.status === 'active' && user.branchIds.includes(branch.id) && user.roleIds.includes('role-cashier'));
    const variants = db.products.filter((product) => !product.archived && product.prices[branch.currency]).flatMap((product) => product.variants);
    let variantId: string | undefined;
    for (let attempt = 0; attempt < maxTries && !variantId; attempt += 1) {
      const candidate = random.pick(variants);
      if (candidate && availableIn(db, candidate.id, branch.id) > 0) variantId = candidate.id;
    }
    if (!variantId || !cashiers.length) return null;
    const sale = recordSale(db, {
      branchId: branch.id,
      cashierId: random.pick(cashiers).id,
      customerId: random.pick(db.customers)?.id,
      at: nowIso(),
      items: [{ variantId, qty: 1 }],
      payments: [{ methodId: random.pick(branch.paymentMethodIds.filter((id) => id !== 'pm-credit')) ?? 'pm-cash', share: 1 }],
      eReceiptFails: random.chance(mockConfig.eReceiptFailureRate),
      newId,
      number: nextNumber('S', 6),
    });
    if (sale.eReceipt.status === 'failed') notify('eReceiptFailed', { number: sale.number }, '/owner/tax?tab=receipts');
    // Low or out of stock after the sale: the owners, the branch manager and the storekeepers are told.
    checkStockAlerts(branch.id, [variantId]);
    return sale.id;
  });

let started = false;

// Starts the simulated checkouts (mockConfig.liveSaleEveryMs; 0 turns them off).
export const startLiveDemo = () => {
  startOnlineOrderFeed();
  if (started || !mockConfig.liveSaleEveryMs) return;
  started = true;
  setInterval(() => {
    // A failed simulated sale (e.g. a mock network error) is skipped; the next one comes on the next tick.
    simulateSale().catch((error: unknown) => console.error(error));
  }, mockConfig.liveSaleEveryMs);
};
