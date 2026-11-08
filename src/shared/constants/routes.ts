// Every path in the app, defined once. Build links with these, never by hand.
export const routes = {
  home: '/',
  signIn: '/sign-in',
  notFound: '*',
  owner: {
    dashboard: '/owner',
    morning: '/owner/today',
    brands: '/owner/brands',
    brand: '/owner/brands/:brandId',
    newBrand: '/owner/brands/new',
    products: '/owner/products',
    product: '/owner/products/:productId',
    newProduct: '/owner/products/new',
    importProducts: '/owner/products/import',
    categories: '/owner/categories',
    branches: '/owner/branches',
    branch: '/owner/branches/:branchId',
    newBranch: '/owner/branches/new',
    currencies: '/owner/currencies',
    tax: '/owner/tax',
    staff: '/owner/staff',
    staffMember: '/owner/staff/:userId',
    newStaff: '/owner/staff/new',
    roles: '/owner/roles',
    promotions: '/owner/promotions',
    promotion: '/owner/promotions/:promotionId',
    newPromotion: '/owner/promotions/new',
    costing: '/owner/costing',
    batch: '/owner/costing/:batchId',
    defects: '/owner/defects',
    stock: '/owner/stock',
    itemHistory: '/owner/stock/item/:variantId',
    transfers: '/owner/transfers',
    payouts: '/owner/payouts',
    brandPayouts: '/owner/payouts/:brandId',
    statement: '/owner/statements/:statementId',
    expenses: '/owner/expenses',
    reports: '/owner/reports',
    report: '/owner/reports/:reportId',
    approvals: '/owner/approvals',
    policies: '/owner/policies',
    activity: '/owner/activity',
    customers: '/owner/customers',
    customer: '/owner/customers/:customerId',
    settings: '/owner/settings',
  },
  manager: {
    dashboard: '/manager',
    staff: '/manager/staff',
    stock: '/manager/stock',
    item: '/manager/stock/item/:variantId',
    transfers: '/manager/transfers',
    newTransfer: '/manager/transfers/new',
    transfer: '/manager/transfers/:transferId',
    counts: '/manager/counts',
    count: '/manager/counts/:countId',
    defects: '/manager/defects',
    approvals: '/manager/approvals',
    registers: '/manager/registers',
    reports: '/manager/reports',
  },
  storekeeper: {
    home: '/storekeeper',
    receiving: '/storekeeper/receiving',
    newReceiving: '/storekeeper/receiving/new',
    receivingRecord: '/storekeeper/receiving/:receivingId',
    defects: '/storekeeper/defects',
    stock: '/storekeeper/stock',
    item: '/storekeeper/stock/item/:variantId',
    counts: '/storekeeper/counts',
    count: '/storekeeper/counts/:countId',
    transfers: '/storekeeper/transfers',
    newTransfer: '/storekeeper/transfers/new',
    transfer: '/storekeeper/transfers/:transferId',
    brandReturns: '/storekeeper/brand-returns',
    newBrandReturn: '/storekeeper/brand-returns/new',
    brandReturn: '/storekeeper/brand-returns/:returnId',
  },
  driver: {
    jobs: '/driver',
    job: '/driver/jobs/:transferId',
  },
  online: {
    orders: '/online',
    order: '/online/orders/:orderId',
    stock: '/online/stock',
  },
  // Pages every signed-in person has
  notifications: '/notifications',
  account: '/account',
  changePassword: '/account/password',
  help: '/help',
  lock: '/lock', // the PIN screen: switch person or come back after an automatic log-out
  cashier: {
    sell: '/cashier',
    held: '/cashier/held',
    customers: '/cashier/customers',
    customer: '/cashier/customers/:customerId',
    stock: '/cashier/stock',
    stockItem: '/cashier/stock/:productId',
    returns: '/cashier/returns',
    receipts: '/cashier/receipts',
    receipt: '/cashier/receipts/:saleId',
    shift: '/cashier/shift',
    mySales: '/cashier/my-sales',
  },
  it: {
    data: '/it', // the IT admin's start page: every database table
    errors: '/it/errors',
    backups: '/it/backups',
  },
  brand: {
    home: '/brand',
    sales: '/brand/sales',
    stock: '/brand/stock',
    returns: '/brand/returns',
    promotions: '/brand/promotions',
  },
} as const;

// A path inside a role's routes, for <Route path>: relativeTo(routes.manager.dashboard, routes.manager.stock) -> 'stock'
export const relativeTo = (base: string, path: string) => path.replace(`${base}/`, '');

// Fills a route's parameters: toPath(routes.owner.brand, { brandId: 'b1' }) -> '/owner/brands/b1'
export const toPath = (route: string, params: Record<string, string>) =>
  route.replace(/:(\w+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ''));

// Adds query parameters: withQuery(routes.owner.stock, { tab: 'aging' }) -> '/owner/stock?tab=aging'
export const withQuery = (path: string, query: Record<string, string | undefined>) => {
  const search = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return search ? `${path}?${search}` : path;
};
