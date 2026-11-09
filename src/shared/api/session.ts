import type { Permission } from '@/shared/constants/permissions';
import type { AlertKind, BuiltInRole, User } from '@/shared/types';
import { nowIso } from '@/shared/utils';
import { ApiError } from './errors';
import { builtInRolesOf } from './branchScope';
import { actor, db, isOwner, logActivity, mutate, respond, sessionUserId, setSessionUserId } from './server';

export interface SessionUser {
  user: Omit<User, 'password' | 'pin' | 'approvalPin'>;
  isOwner: boolean;
  roles: BuiltInRole[]; // the kinds of role the person has (owner, cashier, it...)
  permissions: Permission[]; // everything their roles allow
}

const toSession = (user: User): SessionUser => {
  const { password: _password, pin: _pin, approvalPin: _approvalPin, ...safe } = user;
  const roles = db.roles.filter((role) => user.roleIds.includes(role.id));
  return {
    user: safe,
    isOwner: isOwner(user),
    roles: builtInRolesOf(user),
    permissions: [...new Set(roles.flatMap((role) => role.permissions))],
  };
};

const startSession = (user: User, how: 'password' | 'pin') => {
  setSessionUserId(user.id);
  logActivity({ action: 'signIn', target: { type: 'user', id: user.id, label: user.name }, userId: user.id, at: nowIso(), changes: [{ field: 'method', from: null, to: how }] });
  return toSession(user);
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
    return startSession(user, 'password');
  });

// Quick sign-in on a shared till: the person's own 4-digit PIN. Brand partners don't use the tills.
export const signInWithPin = (pin: string) =>
  mutate(() => {
    const user = db.users.find((current) => current.status === 'active' && !current.brandId && current.pin === pin.trim());
    if (!user) throw new ApiError('wrongPin');
    return startSession(user, 'pin');
  });

// Logs out. `reason` 'idle' when the system logged the person out after a period of inactivity.
export const signOut = (reason: 'manual' | 'idle' | 'switch' = 'manual') =>
  mutate(() => {
    const user = db.users.find((current) => current.id === sessionUserId());
    if (user) logActivity({ action: 'signOut', target: { type: 'user', id: user.id, label: user.name }, userId: user.id, changes: [{ field: 'reason', from: null, to: reason }] });
    setSessionUserId('');
    return true;
  });

// Changes the signed-in person's password. Also used on first sign-in, to replace the owner's temporary password.
export const changePassword = (current: string, next: string) =>
  mutate(() => {
    const user = actor();
    if (user.password !== current) throw new ApiError('wrongCurrentPassword');
    if (next === current) throw new ApiError('samePassword');
    user.password = next;
    user.mustChangePassword = false;
    logActivity({ action: 'update', target: { type: 'user', id: user.id, label: user.name }, changes: [{ field: 'password', from: null, to: null }] });
    return toSession(user);
  });

// The signed-in person's photo. Their name can only be changed by the owner.
export const setMyPhoto = (photo: string | undefined) =>
  mutate(() => {
    const user = actor();
    user.photo = photo;
    logActivity({ action: 'update', target: { type: 'user', id: user.id, label: user.name }, changes: [{ field: 'photo', from: null, to: photo ? 'new' : null }] });
    return toSession(user);
  });

// The owner's own name (staff names are set by the owner, on Staff).
export const setMyName = (name: string) =>
  mutate(() => {
    const user = actor();
    if (!isOwner(user)) throw new ApiError('notAllowed');
    const next = name.trim();
    if (!next) throw new ApiError('notAllowed');
    const from = user.name;
    user.name = next;
    logActivity({ action: 'update', target: { type: 'user', id: user.id, label: next }, changes: [{ field: 'name', from, to: next }] });
    return toSession(user);
  });

// The alerts the signed-in person turned off.
export const setMyMutedAlerts = (kinds: AlertKind[]) =>
  mutate(() => {
    const user = actor();
    user.mutedAlerts = kinds;
    logActivity({ action: 'update', target: { type: 'user', id: user.id, label: user.name }, changes: [{ field: 'alerts', from: null, to: kinds.length }] });
    return toSession(user);
  });

export interface DemoAccount {
  name: string;
  username: string;
  password: string;
  pin: string;
  approvalPin?: string; // managers and owners: the PIN for approving discounts and refunds at a till
  role: BuiltInRole;
  branch?: string; // branch staff: the branch the account works in
  temporary: boolean; // a temporary password from the owner, changed on first sign-in
}

// The roles that have screens in this demo, in menu order. A person with several roles starts on the first one.
export const rolesWithScreens: BuiltInRole[] = ['owner', 'it', 'manager', 'storekeeper', 'online', 'driver', 'cashier', 'brandPartner'];

// Roles whose screens work in one branch at a time (picked in the top bar). The demo shows one account per branch
// for them, so each branch can be tried.
export const branchRoles: BuiltInRole[] = ['manager', 'storekeeper', 'cashier'];

// The people a visitor can try on the sign-in screen: every owner, one account per branch for branch roles, one
// account for each other role, and anyone with a temporary password (to try the first sign-in).
export const demoAccounts = () =>
  respond((): DemoAccount[] => {
    const shown = new Set<string>();
    return rolesWithScreens.flatMap((kind) =>
      db.users
        .filter((user) => user.status === 'active' && rolesWithScreens.find((role) => builtInRolesOf(user).includes(role)) === kind)
        .flatMap((user) => {
          const perBranch = branchRoles.includes(kind);
          const branch = perBranch ? db.branches.find((current) => current.kind !== 'online' && user.branchIds.includes(current.id)) : undefined;
          const key = perBranch ? `${kind}|${branch?.id ?? ''}` : kind;
          if (kind !== 'owner' && !user.mustChangePassword && shown.has(key)) return [];
          shown.add(key);
          return [{ name: user.name, username: user.username, password: user.password, pin: user.brandId ? '' : user.pin, approvalPin: user.approvalPin, role: kind, branch: branch?.name, temporary: user.mustChangePassword }];
        }),
    );
  });
