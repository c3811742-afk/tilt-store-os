// Everything a role can be allowed to see or do. An owner has all of them.
// Grouped for the role editor; the group names and labels are in the text files (text.roles.permissions).
export const permissionGroups = {
  overview: ['dashboard.view', 'reports.view', 'financials.view', 'activity.view'],
  catalog: ['brands.manage', 'products.manage', 'prices.manage', 'promotions.manage', 'costing.manage'],
  stock: ['stock.view', 'stock.otherBranches', 'stock.manage', 'stock.receive', 'stock.count', 'transfers.manage', 'transfers.drive'],
  sales: ['sales.sell', 'sales.discount', 'sales.return', 'sales.void', 'registers.manage', 'customers.view', 'online.orders'],
  money: ['payouts.manage', 'expenses.manage', 'approvals.decide'],
  admin: ['branches.manage', 'tax.manage', 'staff.manage', 'policies.manage', 'settings.manage'],
  brandPortal: ['brandPortal.view'],
} as const;

export type PermissionGroup = keyof typeof permissionGroups;
export type Permission = (typeof permissionGroups)[PermissionGroup][number];

export const allPermissions = Object.values(permissionGroups).flat() as Permission[];

// Permissions that show cost, profit, margin, commission and payouts. Only owners have them by default.
export const financialPermissions: readonly Permission[] = ['financials.view', 'costing.manage', 'payouts.manage', 'expenses.manage'];
