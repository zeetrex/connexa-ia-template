import type { Transaction } from '../../../platform/db/transaction.js';

export interface AppUser {
  id: number;
  googleSub: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  active: boolean;
}

export interface UserWithRoles extends AppUser {
  roles: { id: number; name: string }[];
}

export interface NewUser {
  googleSub: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  active: boolean;
}

export interface UserRepository {
  findByGoogleSub(tx: Transaction, googleSub: string): Promise<AppUser | null>;
  isEmpty(tx: Transaction): Promise<boolean>;
  createUser(tx: Transaction, input: NewUser): Promise<AppUser>;
  assignRole(tx: Transaction, userId: number, roleId: number): Promise<void>;
  setRoles(tx: Transaction, userId: number, roleIds: number[]): Promise<void>;
  setActive(tx: Transaction, userId: number, active: boolean): Promise<void>;
  resolvePermissions(tx: Transaction, userId: number): Promise<string[]>;
  touchLastLogin(tx: Transaction, userId: number): Promise<void>;
  listUsers(tx: Transaction): Promise<UserWithRoles[]>;
  findRoleIdByName(tx: Transaction, name: string): Promise<number | null>;
}
