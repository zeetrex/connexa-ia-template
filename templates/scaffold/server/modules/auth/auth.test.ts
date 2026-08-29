import { describe, it, expect } from 'vitest';
import { InMemoryAuthStore } from './infra/in-memory-auth-store.js';
import { InMemoryUserRepository } from './infra/user.repository.in-memory.js';
import { InMemoryRoleRepository } from './infra/role.repository.in-memory.js';
import { ProtectedRoleError, RoleInUseError } from './domain/errors.js';

describe('InMemoryUserRepository + InMemoryRoleRepository (store compartido)', () => {
  it('createUser → assignRole (Admin) → resolvePermissions resuelve correctamente', async () => {
    const store = new InMemoryAuthStore();
    const userRepo = new InMemoryUserRepository(store);
    const roleRepo = new InMemoryRoleRepository(store);
    const tx = {} as never;

    const adminRole = await roleRepo.createRole(tx, {
      name: 'Admin',
      description: 'Acceso total',
      permissionCodes: ['user.view', 'role.view'],
    });
    // El rol seed Admin es protected=true en Postgres — acá lo marcamos a mano
    // porque InMemoryRoleRepository.createRole() siempre crea protected=false.
    store.rolesById.get(adminRole.id)!.protected = true;

    const user = await userRepo.createUser(tx, {
      googleSub: 'sub-1',
      email: 'admin@zeetrex.com',
      name: 'Admin User',
      pictureUrl: null,
      active: true,
    });

    await userRepo.assignRole(tx, user.id, adminRole.id);

    const permissions = await userRepo.resolvePermissions(tx, user.id);
    expect(permissions.sort()).toEqual(['role.view', 'user.view']);

    const usersWithRoles = await userRepo.listUsers(tx);
    expect(usersWithRoles[0].roles).toEqual([{ id: adminRole.id, name: 'Admin' }]);

    const rolesWithUserCount = await roleRepo.listRoles(tx);
    expect(rolesWithUserCount[0].userCount).toBe(1);
  });

  it('deleteRole sobre un rol con usuarios asignados lanza RoleInUseError', async () => {
    const store = new InMemoryAuthStore();
    const userRepo = new InMemoryUserRepository(store);
    const roleRepo = new InMemoryRoleRepository(store);
    const tx = {} as never;

    const role = await roleRepo.createRole(tx, { name: 'Viewer', description: '', permissionCodes: [] });
    const user = await userRepo.createUser(tx, {
      googleSub: 'sub-2',
      email: 'viewer@zeetrex.com',
      name: 'Viewer User',
      pictureUrl: null,
      active: true,
    });
    await userRepo.assignRole(tx, user.id, role.id);

    await expect(roleRepo.deleteRole(tx, role.id)).rejects.toBeInstanceOf(RoleInUseError);
  });

  it('deleteRole/updateRole sobre un rol protected lanza ProtectedRoleError', async () => {
    const store = new InMemoryAuthStore();
    const roleRepo = new InMemoryRoleRepository(store);
    const tx = {} as never;

    const role = await roleRepo.createRole(tx, { name: 'Admin', description: '', permissionCodes: [] });
    store.rolesById.get(role.id)!.protected = true;

    await expect(roleRepo.deleteRole(tx, role.id)).rejects.toBeInstanceOf(ProtectedRoleError);
    await expect(roleRepo.updateRole(tx, role.id, { name: 'Nope' })).rejects.toBeInstanceOf(ProtectedRoleError);
  });
});
