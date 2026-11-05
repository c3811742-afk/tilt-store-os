import { allPermissions, type Permission } from '@/shared/constants/permissions';
import type { Id, Localized, Role, User } from '@/shared/types';
import { nowIso } from '@/shared/utils';
import { ApiError } from './errors';
import { actor, db, diff, findById, isOwner, logActivity, mutate, newId, respond } from './server';

export type StaffMember = Omit<User, 'password' | 'pin' | 'approvalPin'> & { hasPin: boolean; hasApprovalPin: boolean };

const toMember = ({ password: _password, pin, approvalPin, ...user }: User): StaffMember => ({ ...user, hasPin: Boolean(pin), hasApprovalPin: Boolean(approvalPin) });

export const listStaff = () => respond(() => db.users.map(toMember).sort((a, b) => a.name.localeCompare(b.name)));

export const getStaffMember = (userId: Id) => respond(() => toMember(findById(db.users, userId)));

export interface StaffInput {
  name: string;
  phone: string;
  email: string;
  roleIds: Id[];
  branchIds: Id[];
  brandId?: Id;
}

const ownerRoleId = () => db.roles.find((role) => role.builtIn === 'owner')?.id;
const activeOwnerCount = () => db.users.filter((user) => user.status === 'active' && isOwner(user)).length;

// A temporary password: the person must change it the first time they sign in.
const temporaryPassword = () => `gz-${Math.random().toString(36).slice(2, 8)}`;

const checkEmail = (email: string, exceptId?: Id) => {
  const needle = email.trim().toLowerCase();
  if (needle && db.users.some((user) => user.id !== exceptId && (user.email.toLowerCase() === needle || user.username === needle))) throw new ApiError('duplicateEmail');
};

const usernameFor = (input: StaffInput) => {
  const base = (input.email.split('@')[0] || input.name).toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'user';
  let name = base;
  for (let suffix = 2; db.users.some((user) => user.username === name); suffix += 1) name = `${base}${suffix}`;
  return name;
};

// Adding a person creates their account. An owner gets an invite to set up the account themselves; everyone else
// gets a temporary password from the owner. Returns what to hand over (the invite link or the temporary password).
export const createStaff = (input: StaffInput) =>
  mutate(() => {
    checkEmail(input.email);
    const invitesOwner = input.roleIds.includes(ownerRoleId() ?? '');
    const password = temporaryPassword();
    const user: User = {
      id: newId(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      username: usernameFor(input),
      password,
      roleIds: input.roleIds,
      // Owners see every branch.
      branchIds: invitesOwner ? db.branches.map((branch) => branch.id) : input.branchIds,
      brandId: input.brandId,
      pin: '',
      status: invitesOwner ? 'invited' : 'active',
      mustChangePassword: true,
      createdAt: nowIso(),
      createdById: actor().id,
    };
    db.users.push(user);
    logActivity({ action: 'create', target: { type: 'user', id: user.id, label: user.name } });
    return { member: toMember(user), username: user.username, temporaryPassword: invitesOwner ? null : password, inviteCode: invitesOwner ? password : null };
  });

export const updateStaff = (userId: Id, input: StaffInput) =>
  mutate(() => {
    const user = findById(db.users, userId);
    checkEmail(input.email, userId);
    const wasOwner = isOwner(user);
    const before = { ...user };
    const nextIsOwner = input.roleIds.includes(ownerRoleId() ?? '');
    if (wasOwner && !nextIsOwner && activeOwnerCount() <= 1) throw new ApiError('lastOwner');
    Object.assign(user, {
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      roleIds: input.roleIds,
      branchIds: nextIsOwner ? db.branches.map((branch) => branch.id) : input.branchIds,
      brandId: input.brandId,
    });
    logActivity({ action: 'update', target: { type: 'user', id: user.id, label: user.name }, changes: diff(before, user, ['name', 'phone', 'email', 'roleIds', 'branchIds', 'brandId']) });
    return toMember(user);
  });

export const resetStaffPassword = (userId: Id) =>
  mutate(() => {
    const user = findById(db.users, userId);
    user.password = temporaryPassword();
    user.mustChangePassword = true;
    logActivity({ action: 'update', target: { type: 'user', id: user.id, label: user.name }, changes: [{ field: 'password', from: null, to: 'reset' }] });
    return user.password;
  });

export const setStaffPin = (userId: Id, pin: string) =>
  mutate(() => {
    const user = findById(db.users, userId);
    user.pin = pin;
    logActivity({ action: 'update', target: { type: 'user', id: user.id, label: user.name }, changes: [{ field: 'pin', from: null, to: 'set' }] });
    return true;
  });

// A manager's approval PIN: reset it (they set a new one) or lock it (e.g. after it was shared).
export const resetApprovalPin = (userId: Id) =>
  mutate(() => {
    const user = findById(db.users, userId);
    user.approvalPin = undefined;
    user.approvalPinLocked = false;
    logActivity({ action: 'update', target: { type: 'user', id: user.id, label: user.name }, changes: [{ field: 'approvalPin', from: null, to: 'reset' }] });
    return true;
  });

export const setApprovalPinLocked = (userId: Id, locked: boolean) =>
  mutate(() => {
    const user = findById(db.users, userId);
    user.approvalPinLocked = locked;
    logActivity({ action: locked ? 'archive' : 'restore', target: { type: 'user', id: user.id, label: user.name }, changes: [{ field: 'approvalPinLocked', from: !locked, to: locked }] });
    return true;
  });

// Someone who leaves is deactivated: they can't sign in, and everything they did stays in the history.
export const setStaffActive = (userId: Id, active: boolean) =>
  mutate(() => {
    const user = findById(db.users, userId);
    if (!active && isOwner(user) && user.status === 'active' && activeOwnerCount() <= 1) throw new ApiError('lastOwner');
    const from = user.status;
    user.status = active ? 'active' : 'inactive';
    logActivity({ action: active ? 'restore' : 'archive', target: { type: 'user', id: user.id, label: user.name }, changes: [{ field: 'status', from, to: user.status }] });
    return toMember(user);
  });

// ---- Roles ------------------------------------------------------------------------------------------------------

export const listRoles = () =>
  respond(() => db.roles.map((role) => ({ role, members: db.users.filter((user) => user.status !== 'inactive' && user.roleIds.includes(role.id)).length })));

// The owner role always keeps every permission: every owner can see and do everything.
export const saveRole = (input: { id?: Id; name: Localized; permissions: Permission[] }) =>
  mutate(() => {
    if (input.id) {
      const role = findById(db.roles, input.id);
      const before = { ...role };
      role.name = input.name;
      role.permissions = role.builtIn === 'owner' ? [...allPermissions] : input.permissions;
      logActivity({ action: 'update', target: { type: 'role', id: role.id, label: role.name.en }, changes: diff(before, role, ['name', 'permissions']) });
      return role;
    }
    const role: Role = { id: newId(), name: input.name, permissions: input.permissions };
    db.roles.push(role);
    logActivity({ action: 'create', target: { type: 'role', id: role.id, label: role.name.en } });
    return role;
  });

export const deleteRole = (roleId: Id) =>
  mutate(() => {
    const role = findById(db.roles, roleId);
    if (role.builtIn || db.users.some((user) => user.roleIds.includes(roleId))) throw new ApiError('notAllowed');
    db.roles = db.roles.filter((current) => current.id !== roleId);
    logActivity({ action: 'delete', target: { type: 'role', id: roleId, label: role.name.en } });
    return true;
  });
