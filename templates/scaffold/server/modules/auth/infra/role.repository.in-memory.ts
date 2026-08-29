import type { Transaction } from '../../../platform/db/transaction.js';
import { ProtectedRoleError, RoleInUseError } from '../domain/errors.js';
import type { NewRole, RoleRepository, RoleWithPermissions } from '../ports/role.repository.js';
import { InMemoryAuthStore, type StoredRole } from './in-memory-auth-store.js';

function toRoleWithPermissions(role: StoredRole, store: InMemoryAuthStore): RoleWithPermissions {
  let userCount = 0;
  for (const roles of store.userRoles.values()) if (roles.has(role.id)) userCount++;
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    active: role.active,
    protected: role.protected,
    userCount,
    permissions: [...role.permissionCodes].sort(),
  };
}

export class InMemoryRoleRepository implements RoleRepository {
  constructor(private store: InMemoryAuthStore = new InMemoryAuthStore()) {}

  async listRoles(_tx: Transaction): Promise<RoleWithPermissions[]> {
    return [...this.store.rolesById.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => toRoleWithPermissions(r, this.store));
  }

  async createRole(_tx: Transaction, input: NewRole): Promise<RoleWithPermissions> {
    const role: StoredRole = {
      id: this.store.nextId++,
      name: input.name,
      description: input.description,
      active: true,
      protected: false,
      permissionCodes: new Set(input.permissionCodes),
    };
    this.store.rolesById.set(role.id, role);
    return toRoleWithPermissions(role, this.store);
  }

  async updateRole(_tx: Transaction, id: number, input: Partial<NewRole>): Promise<RoleWithPermissions> {
    const role = this.store.rolesById.get(id);
    if (!role) throw new Error(`Rol ${id} no encontrado`);
    if (role.protected) throw new ProtectedRoleError(id);
    if (input.name != null) role.name = input.name;
    if (input.description != null) role.description = input.description;
    if (input.permissionCodes != null) role.permissionCodes = new Set(input.permissionCodes);
    return toRoleWithPermissions(role, this.store);
  }

  async deleteRole(_tx: Transaction, id: number): Promise<void> {
    const role = this.store.rolesById.get(id);
    if (!role) return;
    if (role.protected) throw new ProtectedRoleError(id);
    for (const roles of this.store.userRoles.values()) {
      if (roles.has(id)) throw new RoleInUseError(id);
    }
    this.store.rolesById.delete(id);
  }

  async listPermissionCodes(_tx: Transaction): Promise<string[]> {
    const codes = new Set<string>();
    for (const role of this.store.rolesById.values()) for (const c of role.permissionCodes) codes.add(c);
    return [...codes].sort();
  }

  async listPermissions(tx: Transaction): Promise<{ code: string; description: string }[]> {
    return (await this.listPermissionCodes(tx)).map((code) => ({ code, description: '' }));
  }
}
