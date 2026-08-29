import type { Transaction } from '../../../platform/db/transaction.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}, New{{EXAMPLE_MODULE_NAME_PASCAL}} } from '../domain/{{EXAMPLE_MODULE_NAME}}.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}Repository } from '../ports/{{EXAMPLE_MODULE_NAME}}.repository.js';

function num(v: unknown): number {
  return typeof v === 'string' ? Number(v) : (v as number);
}

interface Row {
  id: number | string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

function toDomain(row: Row): {{EXAMPLE_MODULE_NAME_PASCAL}} {
  return {
    id: num(row.id),
    title: row.title,
    description: row.description,
    status: row.status as {{EXAMPLE_MODULE_NAME_PASCAL}}['status'],
    createdAt: new Date(row.created_at),
  };
}

const COLUMNS = 'id, title, description, status, created_at';

export class Pg{{EXAMPLE_MODULE_NAME_PASCAL}}Repository implements {{EXAMPLE_MODULE_NAME_PASCAL}}Repository {
  async create(tx: Transaction, input: New{{EXAMPLE_MODULE_NAME_PASCAL}}): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}> {
    const { rows } = await tx.query(
      `INSERT INTO {{EXAMPLE_ENTITY_TABLE}} (title, description) VALUES ($1, $2) RETURNING ${COLUMNS}`,
      [input.title, input.description],
    );
    return toDomain(rows[0] as Row);
  }

  async findById(tx: Transaction, id: number): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null> {
    const { rows } = await tx.query(`SELECT ${COLUMNS} FROM {{EXAMPLE_ENTITY_TABLE}} WHERE id = $1`, [id]);
    return rows[0] ? toDomain(rows[0] as Row) : null;
  }

  async listAll(tx: Transaction): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}[]> {
    const { rows } = await tx.query(`SELECT ${COLUMNS} FROM {{EXAMPLE_ENTITY_TABLE}} ORDER BY created_at DESC`, []);
    return (rows as Row[]).map(toDomain);
  }

  async update(tx: Transaction, id: number, input: Partial<New{{EXAMPLE_MODULE_NAME_PASCAL}}> & { status?: string }): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null> {
    const { rows } = await tx.query(
      `UPDATE {{EXAMPLE_ENTITY_TABLE}}
          SET title = COALESCE($2, title), description = COALESCE($3, description), status = COALESCE($4, status)
        WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, input.title ?? null, input.description ?? null, input.status ?? null],
    );
    return rows[0] ? toDomain(rows[0] as Row) : null;
  }

  async deleteById(tx: Transaction, id: number): Promise<boolean> {
    const { rowCount } = await tx.query(`DELETE FROM {{EXAMPLE_ENTITY_TABLE}} WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
