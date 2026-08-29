import type { Transaction } from '../../../platform/db/transaction.js';
import type { AppUser, NewUser, UserRepository, UserWithRoles } from '../ports/user.repository.js';
import { InMemoryAuthStore, type StoredUser } from './in-memory-auth-store.js';

function toAppUser(u: StoredUser): AppUser {
  return { id: u.id, googleSub: u.googleSub, email: u.email, name: u.name, pictureUrl: u.pictureUrl, active: u.active };
}

export class InMemoryUserRepository implements UserRepository {
  constructor(private store: InMemoryAuthStore = new InMemoryAuthStore()) {}

  async findByGoogleSub(_tx: Transaction, googleSub: string): Promise<AppUser | null> {
    const id = this.store.usersByGoogleSub.get(googleSub);
    if (id == null) return null;
    const u = this.store.usersById.get(id);
    return u ? toAppUser(u) : null;
  }

  async isEmpty(_tx: Transaction): Promise<boolean> {
    return this.store.usersById.size === 0;
  }

  async createUser(_tx: Transaction, input: NewUser): Promise<AppUser> {
    const user: StoredUser = { id: this.store.nextId++, ...input, lastLoginAt: null };
    this.store.usersById.set(user.id, user);
    this.store.usersByGoogleSub.set(user.googleSub, user.id);
    return toAppUser(user);
  }

  async assignRole(_tx: Transaction, userId: number, roleId: number): Promise<void> {
    const roles = this.store.userRoles.get(userId) ?? new Set<number>();
    roles.add(roleId);
    this.store.userRoles.set(userId, roles);
  }

  async setRoles(_tx: Transaction, userId: number, roleIds: number[]): Promise<void> {
    this.store.userRoles.set(userId, new Set(roleIds));
  }

  async setActive(_tx: Transaction, userId: number, active: boolean): Promise<void> {
    const u = this.store.usersById.get(userId);
    if (u) u.active = active;
  }

  async resolvePermissions(_tx: Transaction, userId: number): Promise<string[]> {
    const roleIds = this.store.userRoles.get(userId) ?? new Set<number>();
    const permissions = new Set<string>();
    for (const roleId of roleIds) {
      const role = this.store.rolesById.get(roleId);
      if (!role) continue;
      for (const code of role.permissionCodes) permissions.add(code);
    }
    return [...permissions];
  }

  async touchLastLogin(_tx: Transaction, userId: number): Promise<void> {
    const u = this.store.usersById.get(userId);
    if (u) u.lastLoginAt = new Date();
  }

  async listUsers(_tx: Transaction): Promise<UserWithRoles[]> {
    return [...this.store.usersById.values()].map((u) => ({
      ...toAppUser(u),
      roles: [...(this.store.userRoles.get(u.id) ?? [])]
        .map((roleId) => this.store.rolesById.get(roleId))
        .filter((r): r is NonNullable<typeof r> => r != null)
        .map((r) => ({ id: r.id, name: r.name })),
    }));
  }

  async findRoleIdByName(_tx: Transaction, name: string): Promise<number | null> {
    for (const role of this.store.rolesById.values()) if (role.name === name) return role.id;
    return null;
  }
}
