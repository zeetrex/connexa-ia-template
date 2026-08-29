import type { Transaction } from '../../../platform/db/transaction.js';
import { ProtectedRoleError, RoleInUseError } from '../domain/errors.js';
import type { NewRole, RoleRepository, RoleWithPermissions } from '../ports/role.repository.js';

function num(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

async function one<T>(tx: Transaction, sql: string, params: unknown[]): Promise<T | undefined> {
  const { rows } = await tx.query(sql, params);
  return rows[0] as T | undefined;
}

interface RoleRow {
  id: number | string;
  name: string;
  description: string;
  active: boolean;
  protected: boolean;
}

function toRoleWithPermissions(row: RoleRow, permissions: string[], userCount: number): RoleWithPermissions {
  return { id: num(row.id), name: row.name, description: row.description, active: row.active, protected: row.protected, userCount, permissions };
}

async function assertNotProtected(tx: Transaction, id: number): Promise<void> {
  const row = await one<{ protected: boolean }>(tx, 'SELECT protected FROM role WHERE id = $1', [id]);
  if (row?.protected) throw new ProtectedRoleError(id);
}

async function permissionsFor(tx: Transaction, roleId: number): Promise<string[]> {
  const { rows } = await tx.query('SELECT permission_code FROM role_permission WHERE role_id = $1 ORDER BY permission_code', [roleId]);
  return (rows as { permission_code: string }[]).map((r) => r.permission_code);
}

export class PgRoleRepository implements RoleRepository {
  async listRoles(tx: Transaction): Promise<RoleWithPermissions[]> {
    const { rows } = await tx.query(
      `SELECT r.id, r.name, r.description, r.active, r.protected,
              COUNT(DISTINCT ur.user_id) AS user_count,
              COALESCE(json_agg(DISTINCT rp.permission_code) FILTER (WHERE rp.permission_code IS NOT NULL), '[]') AS permissions
         FROM role r
         LEFT JOIN role_permission rp ON rp.role_id = r.id
         LEFT JOIN user_role ur ON ur.role_id = r.id
        GROUP BY r.id ORDER BY r.name`,
      [],
    );
    return (rows as (RoleRow & { user_count: string; permissions: string[] })[]).map((row) =>
      toRoleWithPermissions(row, [...row.permissions].sort(), num(row.user_count)),
    );
  }

  async createRole(tx: Transaction, input: NewRole): Promise<RoleWithPermissions> {
    const row = await one<RoleRow>(
      tx,
      'INSERT INTO role (name, description) VALUES ($1, $2) RETURNING id, name, description, active, protected',
      [input.name, input.description],
    );
    const roleId = num(row!.id);
    for (const code of input.permissionCodes) {
      await tx.query('INSERT INTO role_permission (role_id, permission_code) VALUES ($1, $2)', [roleId, code]);
    }
    return toRoleWithPermissions({ ...row!, id: roleId }, [...input.permissionCodes].sort(), 0);
  }

  async updateRole(tx: Transaction, id: number, input: Partial<NewRole>): Promise<RoleWithPermissions> {
    await assertNotProtected(tx, id);
    if (input.name != null || input.description != null) {
      await tx.query('UPDATE role SET name = COALESCE($2, name), description = COALESCE($3, description) WHERE id = $1', [id, input.name ?? null, input.description ?? null]);
    }
    if (input.permissionCodes != null) {
      await tx.query('DELETE FROM role_permission WHERE role_id = $1', [id]);
      for (const code of input.permissionCodes) {
        await tx.query('INSERT INTO role_permission (role_id, permission_code) VALUES ($1, $2)', [id, code]);
      }
    }
    const row = await one<RoleRow>(tx, 'SELECT id, name, description, active, protected FROM role WHERE id = $1', [id]);
    if (!row) throw new Error(`Rol ${id} no encontrado`);
    const userCountRow = await one<{ count: string }>(tx, 'SELECT count(*) AS count FROM user_role WHERE role_id = $1', [id]);
    return toRoleWithPermissions(row, await permissionsFor(tx, id), num(userCountRow?.count ?? 0));
  }

  async deleteRole(tx: Transaction, id: number): Promise<void> {
    await assertNotProtected(tx, id);
    // Chequeo explícito en la app, no ON DELETE RESTRICT de esquema: role_permission
    // sí debe cascadear, sólo user_role necesita frenar el borrado.
    const referenced = await one<{ count: string }>(tx, 'SELECT count(*) AS count FROM user_role WHERE role_id = $1', [id]);
    if (num(referenced?.count ?? 0) > 0) throw new RoleInUseError(id);
    await tx.query('DELETE FROM role WHERE id = $1', [id]);
  }

  async listPermissionCodes(tx: Transaction): Promise<string[]> {
    const { rows } = await tx.query('SELECT code FROM permission ORDER BY code', []);
    return (rows as { code: string }[]).map((r) => r.code);
  }

  async listPermissions(tx: Transaction): Promise<{ code: string; description: string }[]> {
    const { rows } = await tx.query('SELECT code, description FROM permission ORDER BY code', []);
    return rows as { code: string; description: string }[];
  }
}
