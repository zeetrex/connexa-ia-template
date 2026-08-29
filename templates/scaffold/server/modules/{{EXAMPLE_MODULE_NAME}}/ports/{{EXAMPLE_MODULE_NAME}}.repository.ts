import type { Transaction } from '../../../platform/db/transaction.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}, New{{EXAMPLE_MODULE_NAME_PASCAL}} } from '../domain/{{EXAMPLE_MODULE_NAME}}.js';

export interface {{EXAMPLE_MODULE_NAME_PASCAL}}Repository {
  create(tx: Transaction, input: New{{EXAMPLE_MODULE_NAME_PASCAL}}): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}>;
  findById(tx: Transaction, id: number): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null>;
  listAll(tx: Transaction): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}[]>;
  update(tx: Transaction, id: number, input: Partial<New{{EXAMPLE_MODULE_NAME_PASCAL}}> & { status?: string }): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null>;
  deleteById(tx: Transaction, id: number): Promise<boolean>;
}
