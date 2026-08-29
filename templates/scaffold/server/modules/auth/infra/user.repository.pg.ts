import type { Transaction } from '../../../platform/db/transaction.js';
import type { AppUser, NewUser, UserRepository, UserWithRoles } from '../ports/user.repository.js';

function num(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

async function one<T>(tx: Transaction, sql: string, params: unknown[]): Promise<T | undefined> {
  const { rows } = await tx.query(sql, params);
  return rows[0] as T | undefined;
}

interface UserRow {
  id: number | string;
  google_sub: string;
  email: string;
  name: string;
  picture_url: string | null;
  active: boolean;
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: num(row.id),
    googleSub: row.google_sub,
    email: row.email,
    name: row.name,
    pictureUrl: row.picture_url,
    active: row.active,
  };
}

const USER_COLUMNS = 'id, google_sub, email, name, picture_url, active';

export class PgUserRepository implements UserRepository {
  async findByGoogleSub(tx: Transaction, googleSub: string): Promise<AppUser | null> {
    const row = await one<UserRow>(tx, `SELECT ${USER_COLUMNS} FROM app_user WHERE google_sub = $1`, [googleSub]);
    return row ? toAppUser(row) : null;
  }

  async isEmpty(tx: Transaction): Promise<boolean> {
    const row = await one<{ count: string }>(tx, 'SELECT count(*) AS count FROM app_user', []);
    return num(row?.count ?? 0) === 0;
  }

  async createUser(tx: Transaction, input: NewUser): Promise<AppUser> {
    const row = await one<UserRow>(
      tx,
      `INSERT INTO app_user (google_sub, email, name, picture_url, active)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${USER_COLUMNS}`,
      [input.googleSub, input.email, input.name, input.pictureUrl, input.active],
    );
    return toAppUser(row!);
  }

  async assignRole(tx: Transaction, userId: number, roleId: number): Promise<void> {
    await tx.query(
      `INSERT INTO user_role (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId],
    );
  }

  async setRoles(tx: Transaction, userId: number, roleIds: number[]): Promise<void> {
    await tx.query('DELETE FROM user_role WHERE user_id = $1', [userId]);
    for (const roleId of roleIds) {
      await tx.query('INSERT INTO user_role (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
    }
  }

  async setActive(tx: Transaction, userId: number, active: boolean): Promise<void> {
    await tx.query('UPDATE app_user SET active = $2 WHERE id = $1', [userId, active]);
  }

  async resolvePermissions(tx: Transaction, userId: number): Promise<string[]> {
    const { rows } = await tx.query(
      `SELECT DISTINCT rp.permission_code FROM user_role ur
         JOIN role_permission rp ON rp.role_id = ur.role_id WHERE ur.user_id = $1`,
      [userId],
    );
    return (rows as { permission_code: string }[]).map((r) => r.permission_code);
  }

  async touchLastLogin(tx: Transaction, userId: number): Promise<void> {
    await tx.query('UPDATE app_user SET last_login_at = NOW() WHERE id = $1', [userId]);
  }

  async listUsers(tx: Transaction): Promise<UserWithRoles[]> {
    const { rows } = await tx.query(
      `SELECT u.id, u.google_sub, u.email, u.name, u.picture_url, u.active,
              COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name) ORDER BY r.name)
                FILTER (WHERE r.id IS NOT NULL), '[]') AS roles
         FROM app_user u
         LEFT JOIN user_role ur ON ur.user_id = u.id
         LEFT JOIN role r ON r.id = ur.role_id
        GROUP BY u.id ORDER BY u.email`,
      [],
    );
    return (rows as (UserRow & { roles: { id: number; name: string }[] })[]).map((row) => ({
      ...toAppUser(row),
      roles: row.roles,
    }));
  }

  async findRoleIdByName(tx: Transaction, name: string): Promise<number | null> {
    const row = await one<{ id: string }>(tx, 'SELECT id FROM role WHERE name = $1', [name]);
    return row ? num(row.id) : null;
  }
}
