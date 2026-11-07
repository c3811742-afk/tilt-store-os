import { storageKeys } from '@/shared/constants';
import type { Permission } from '@/shared/constants/permissions';
import type { AlertKind, BuiltInRole, User } from '@/shared/types';
import { nowIso, storage } from '@/shared/utils';
import { ApiError } from './errors';
import { actor, db, isOwner, logActivity, mutate, respond, sessionUserId } from './server';

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
    roles: roles.flatMap((role) => (role.builtIn ? [role.builtIn] : [])),
    permissions: [...new Set(roles.flatMap((role) => role.permissions))],
  };
};

const startSession = (user: User, how: 'password' | 'pin') => {
  storage.set(storageKeys.session, user.id);
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
    storage.set(storageKeys.session, '');
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
  role: BuiltInRole;
  temporary: boolean; // a temporary password from the owner, changed on first sign-in
}

// The roles that have screens in this demo, in menu order. The sign-in screen lists their people, so a visitor
// can try each one.
export const rolesWithScreens: BuiltInRole[] = ['owner', 'it', 'manager', 'cashier', 'brandPartner'];

export const demoAccounts = () =>
  respond((): DemoAccount[] =>
    rolesWithScreens.flatMap((kind) =>
      db.users
        .filter((user) => user.status === 'active' && toSession(user).roles[0] === kind)
        .map((user) => ({ name: user.name, username: user.username, password: user.password, pin: user.brandId ? '' : user.pin, role: kind, temporary: user.mustChangePassword })),
    ),
  );
