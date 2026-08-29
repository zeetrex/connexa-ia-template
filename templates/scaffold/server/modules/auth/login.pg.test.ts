import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import type { Transaction } from '../../platform/db/transaction.js';
import { ProtectedRoleError, RoleInUseError } from './domain/errors.js';

const HAS_DB = !!process.env.DATABASE_URL;
let pool: Pool;

beforeAll(async () => {
  if (!HAS_DB) return;
  ({ pool } = (await import('../../platform/db/pool.js')) as unknown as { pool: Pool });
});

afterAll(async () => {
  if (HAS_DB && pool) await pool.end();
});

/**
 * Cada test corre en su propio SAVEPOINT, dentro de una transacción externa
 * que también se revierte — reproduce la semántica real de withTransaction()
 * (que abre su propia transacción por caso de uso) sin escribir nada
 * permanente.
 */
async function inSavepoint(body: (tx: Transaction) => Promise<void>): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT sp_test');
    await body(client);
    await client.query('ROLLBACK TO SAVEPOINT sp_test');
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

describe.skipIf(!HAS_DB)('auth — integración contra Postgres real', () => {
  it('bootstrap: el primer usuario de una base vacía queda active=true con rol Admin', async () => {
    const { PgUserRepository } = await import('./infra/user.repository.pg.js');
    const userRepo = new PgUserRepository();

    await inSavepoint(async (tx) => {
      const isFirst = await userRepo.isEmpty(tx);
      expect(isFirst).toBe(true);

      const user = await userRepo.createUser(tx, {
        googleSub: 'google-sub-1',
        email: 'first@zeetrex.com',
        name: 'First User',
        pictureUrl: null,
        active: isFirst,
      });
      expect(user.active).toBe(true);

      const adminRoleId = await userRepo.findRoleIdByName(tx, 'Admin');
      expect(adminRoleId).not.toBeNull();
      await userRepo.assignRole(tx, user.id, adminRoleId!);

      const permissions = await userRepo.resolvePermissions(tx, user.id);
      expect(permissions).toContain('user.view');
      expect(permissions).toContain('role.view');
    });
  });

  it('segundo usuario de una base no vacía queda active=false', async () => {
    const { PgUserRepository } = await import('./infra/user.repository.pg.js');
    const userRepo = new PgUserRepository();

    await inSavepoint(async (tx) => {
      await userRepo.createUser(tx, {
        googleSub: 'google-sub-a',
        email: 'a@zeetrex.com',
        name: 'A',
        pictureUrl: null,
        active: true,
      });

      const isFirst = await userRepo.isEmpty(tx);
      expect(isFirst).toBe(false);

      const second = await userRepo.createUser(tx, {
        googleSub: 'google-sub-b',
        email: 'b@zeetrex.com',
        name: 'B',
        pictureUrl: null,
        active: isFirst,
      });
      expect(second.active).toBe(false);
    });
  });

  it('deleteRole sobre el rol Admin lanza ProtectedRoleError', async () => {
    const { PgRoleRepository } = await import('./infra/role.repository.pg.js');
    const roleRepo = new PgRoleRepository();

    await inSavepoint(async (tx) => {
      const roles = await roleRepo.listRoles(tx);
      const admin = roles.find((r) => r.name === 'Admin');
      expect(admin).toBeDefined();
      await expect(roleRepo.deleteRole(tx, admin!.id)).rejects.toBeInstanceOf(ProtectedRoleError);
    });
  });

  it('deleteRole sobre un rol con usuarios asignados lanza RoleInUseError', async () => {
    const { PgUserRepository } = await import('./infra/user.repository.pg.js');
    const { PgRoleRepository } = await import('./infra/role.repository.pg.js');
    const userRepo = new PgUserRepository();
    const roleRepo = new PgRoleRepository();

    await inSavepoint(async (tx) => {
      const role = await roleRepo.createRole(tx, { name: 'Viewer', description: '', permissionCodes: [] });
      const user = await userRepo.createUser(tx, {
        googleSub: 'google-sub-c',
        email: 'c@zeetrex.com',
        name: 'C',
        pictureUrl: null,
        active: true,
      });
      await userRepo.assignRole(tx, user.id, role.id);

      await expect(roleRepo.deleteRole(tx, role.id)).rejects.toBeInstanceOf(RoleInUseError);
    });
  });
});
