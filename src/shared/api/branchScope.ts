import type { AlertKind, BuiltInRole, Id, StaffAlertKind, User } from '@/shared/types';
import { ApiError } from './errors';
import { actor, db, findById, isOwner, notify } from './server';

// Branch staff (managers, storekeepers, cashiers, drivers, online orders staff) only reach their own branches;
// owners and the IT admin reach every branch.
// Every call for them checks the branch here, on the "server", so a page can't ask for another branch.
export const assertBranch = (branchId: Id, user: User = actor()) => {
  if (!isOwner(user) && !hasRole(user, 'it') && !user.branchIds.includes(branchId)) throw new ApiError('notAllowed');
  return findById(db.branches, branchId);
};

// The built-in roles behind a user's roles.
export const builtInRolesOf = (user: User): BuiltInRole[] =>
  user.roleIds.flatMap((roleId) => {
    const builtIn = db.roles.find((role) => role.id === roleId)?.builtIn;
    return builtIn ? [builtIn] : [];
  });

export const hasRole = (user: User, role: BuiltInRole) => builtInRolesOf(user).includes(role);

// Active people with a role in a branch (e.g. the managers of the branch a transfer arrives in).
export const staffWithRole = (role: BuiltInRole, branchId?: Id) =>
  db.users.filter((user) => user.status === 'active' && hasRole(user, role) && (!branchId || user.branchIds.includes(branchId))).map((user) => user.id);

// Sends an alert to these people only (not the owners).
export const notifyUsers = (kind: AlertKind | StaffAlertKind, params: Record<string, string>, link: string, userIds: readonly Id[]) => notify(kind, params, link, userIds, false);
