import type { Id, IsoDateTime, Localized } from './common';
import type { Permission } from '@/shared/constants/permissions';

export type BuiltInRole = 'owner' | 'manager' | 'cashier' | 'storekeeper' | 'driver' | 'brandPartner' | 'online';

export interface Role {
  id: Id;
  name: Localized;
  permissions: Permission[];
  builtIn?: BuiltInRole; // the system's own roles; their key permissions can't be removed
}

export type UserStatus = 'active' | 'invited' | 'inactive';

export interface User {
  id: Id;
  name: string;
  phone: string;
  email: string;
  username: string;
  password: string; // demo only: kept in the browser's mock data
  roleIds: Id[];
  branchIds: Id[];
  pin: string; // the till PIN
  approvalPin?: string;
  approvalPinLocked?: boolean;
  status: UserStatus;
  mustChangePassword: boolean;
  brandId?: Id; // brand partners: the one brand they can see
  photo?: string;
  createdAt: IsoDateTime;
  createdById?: Id;
}
