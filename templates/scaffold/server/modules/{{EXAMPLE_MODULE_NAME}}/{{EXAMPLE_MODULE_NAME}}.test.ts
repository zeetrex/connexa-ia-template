import { describe, it, expect } from 'vitest';
import { InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository } from './infra/{{EXAMPLE_MODULE_NAME}}.repository.in-memory.js';
import { validateTitle } from './domain/{{EXAMPLE_MODULE_NAME}}.js';

describe('validateTitle', () => {
  it('rechaza título vacío', () => {
    expect(validateTitle('')).not.toBeNull();
  });
  it('rechaza título de más de 200 caracteres', () => {
    expect(validateTitle('a'.repeat(201))).not.toBeNull();
  });
  it('acepta título válido', () => {
    expect(validateTitle('Comprar licencias')).toBeNull();
  });
});

describe('InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository', () => {
  it('ciclo completo create → findById → update → deleteById', async () => {
    const repo = new InMemory{{EXAMPLE_MODULE_NAME_PASCAL}}Repository();
    const tx = {} as never;
    const created = await repo.create(tx, { title: 'Test', description: '' });
    expect(created.status).toBe('pending');

    const found = await repo.findById(tx, created.id);
    expect(found?.title).toBe('Test');

    const updated = await repo.update(tx, created.id, { status: 'done' });
    expect(updated?.status).toBe('done');

    const deleted = await repo.deleteById(tx, created.id);
    expect(deleted).toBe(true);
    expect(await repo.findById(tx, created.id)).toBeNull();
  });
});
