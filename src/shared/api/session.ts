import { storageKeys } from '@/shared/constants';
import type { User } from '@/shared/types';
import { nowIso, storage } from '@/shared/utils';
import { ApiError } from './errors';
import { db, isOwner, logActivity, mutate, respond, sessionUserId } from './server';

export interface SessionUser {
  user: Omit<User, 'password' | 'pin' | 'approvalPin'>;
  isOwner: boolean;
}

const toSession = (user: User): SessionUser => {
  const { password: _password, pin: _pin, approvalPin: _approvalPin, ...safe } = user;
  return { user: safe, isOwner: isOwner(user) };
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

// Owners on the demo's sign-in screen, so a visitor can try each one.
export const demoAccounts = () =>
  respond(() => db.users.filter((user) => user.status === 'active' && isOwner(user)).map((user) => ({ name: user.name, username: user.username, password: user.password })));
