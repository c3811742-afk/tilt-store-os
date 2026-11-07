import { homeFor, storageKeys } from '@/shared/constants';
import type { BuiltInRole, User } from '@/shared/types';
import { nowIso, storage } from '@/shared/utils';
import { ApiError } from './errors';
import { builtInRolesOf } from './branchScope';
import { db, isOwner, logActivity, mutate, respond, sessionUserId } from './server';

export interface SessionUser {
  user: Omit<User, 'password' | 'pin' | 'approvalPin'>;
  isOwner: boolean;
  roles: BuiltInRole[]; // the built-in roles behind the user's roles: they decide which screens open
}

const toSession = (user: User): SessionUser => {
  const { password: _password, pin: _pin, approvalPin: _approvalPin, ...safe } = user;
  return { user: safe, isOwner: isOwner(user), roles: builtInRolesOf(user) };
};

// The signed-in user, or null.
export const getSession = () =>
  respond(() => {
    const user = db.users.find((current) => current.id === sessionUserId() && current.status !== 'inactive');
    return user ? toSession(user) : null;
  });

// Signs in with a username or email and the password.
export const signIn = (login: string, password: string) =>
  mutate(() => {
    const needle = login.trim().toLowerCase();
    const user = db.users.find((current) => current.status !== 'inactive' && (current.username === needle || current.email.toLowerCase() === needle));
    if (!user || user.password !== password) throw new ApiError('wrongPassword');
    storage.set(storageKeys.session, user.id);
    logActivity({ action: 'signIn', target: { type: 'user', id: user.id, label: user.name }, userId: user.id, at: nowIso() });
    return toSession(user);
  });

export const signOut = () =>
  respond(() => {
    storage.set(storageKeys.session, '');
    return true;
  });

// One account for each role that has screens, on the demo's sign-in screen, so a visitor can try each one.
export const demoAccounts = () =>
  respond(() => {
    const active = db.users.filter((user) => user.status === 'active');
    const shown = new Set<string>();
    return active.flatMap((user) => {
      const roles = builtInRolesOf(user);
      const home = homeFor(roles);
      const role = roles.find((current) => homeFor([current]) === home);
      // Every owner, and a branch manager and storekeeper for each branch, so each branch can be tried; one account for other roles.
      if (!home || !role) return [];
      const perBranch = role === 'manager' || role === 'storekeeper';
      const branchOf = db.branches.find((branch) => (branch.kind === 'store' || (role === 'storekeeper' && branch.kind === 'warehouse')) && user.branchIds.includes(branch.id));
      const key = perBranch ? `${role}|${branchOf?.id ?? ''}` : role;
      if (role !== 'owner' && shown.has(key)) return [];
      shown.add(key);
      const roleName = db.roles.find((current) => current.builtIn === role)?.name;
      const branch = perBranch ? branchOf?.name : undefined;
      return [{ name: user.name, username: user.username, password: user.password, role, roleName, branch }];
    });
  });
