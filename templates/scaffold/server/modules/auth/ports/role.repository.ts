import type { Transaction } from '../../../platform/db/transaction.js';

export interface RoleWithPermissions {
  id: number;
  name: string;
  description: string;
  active: boolean;
  /** true sólo en el rol semilla (Admin) — flag, nunca por nombre. */
  protected: boolean;
  userCount: number;
  permissions: string[];
}

export interface NewRole {
  name: string;
  description: string;
  permissionCodes: string[];
}

export interface RoleRepository {
  listRoles(tx: Transaction): Promise<RoleWithPermissions[]>;
  createRole(tx: Transaction, input: NewRole): Promise<RoleWithPermissions>;
  /** Lanza `ProtectedRoleError` si `protected = true`. */
  updateRole(tx: Transaction, id: number, input: Partial<NewRole>): Promise<RoleWithPermissions>;
  /** Lanza `ProtectedRoleError` si `protected`, `RoleInUseError` si tiene usuarios asignados. */
  deleteRole(tx: Transaction, id: number): Promise<void>;
  listPermissionCodes(tx: Transaction): Promise<string[]>;
  listPermissions(tx: Transaction): Promise<{ code: string; description: string }[]>;
}
