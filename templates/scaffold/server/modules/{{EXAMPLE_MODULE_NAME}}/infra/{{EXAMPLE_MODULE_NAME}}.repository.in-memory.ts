import type { Transaction } from '../../../platform/db/transaction.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}, New{{EXAMPLE_MODULE_NAME_PASCAL}} } from '../domain/{{EXAMPLE_MODULE_NAME}}.js';
import type { {{EXAMPLE_MODULE_NAME_PASCAL}}Repository } from '../ports/{{EXAMPLE_MODULE_NAME}}.repository.js';

export class InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository implements {{EXAMPLE_MODULE_NAME_PASCAL}}Repository {
  private items = new Map<number, {{EXAMPLE_MODULE_NAME_PASCAL}}>();
  private nextId = 1;

  async create(_tx: Transaction, input: New{{EXAMPLE_MODULE_NAME_PASCAL}}): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}> {
    const item: {{EXAMPLE_MODULE_NAME_PASCAL}} = { id: this.nextId++, title: input.title, description: input.description, status: 'pending', createdAt: new Date() };
    this.items.set(item.id, item);
    return item;
  }

  async findById(_tx: Transaction, id: number): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null> {
    return this.items.get(id) ?? null;
  }

  async listAll(_tx: Transaction): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}}[]> {
    return [...this.items.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(_tx: Transaction, id: number, input: Partial<New{{EXAMPLE_MODULE_NAME_PASCAL}}> & { status?: string }): Promise<{{EXAMPLE_MODULE_NAME_PASCAL}} | null> {
    const item = this.items.get(id);
    if (!item) return null;
    if (input.title != null) item.title = input.title;
    if (input.description != null) item.description = input.description;
    if (input.status != null) item.status = input.status as {{EXAMPLE_MODULE_NAME_PASCAL}}['status'];
    return item;
  }

  async deleteById(_tx: Transaction, id: number): Promise<boolean> {
    return this.items.delete(id);
  }
}
