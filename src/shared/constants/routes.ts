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
    notifications: '/owner/notifications',
    activity: '/owner/activity',
    customers: '/owner/customers',
    customer: '/owner/customers/:customerId',
    settings: '/owner/settings',
  },
} as const;

// Fills a route's parameters: toPath(routes.owner.brand, { brandId: 'b1' }) -> '/owner/brands/b1'
export const toPath = (route: string, params: Record<string, string>) =>
  route.replace(/:(\w+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ''));

// Adds query parameters: withQuery(routes.owner.stock, { tab: 'aging' }) -> '/owner/stock?tab=aging'
export const withQuery = (path: string, query: Record<string, string | undefined>) => {
  const search = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return search ? `${path}?${search}` : path;
};
