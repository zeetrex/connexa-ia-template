import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { withTransaction } from '../../../platform/db/unit-of-work.js';
import { requirePermission } from '../../../platform/http/require-permission.js';
import { validateTitle } from '../domain/{{EXAMPLE_MODULE_NAME}}.js';
import { Pg{{EXAMPLE_MODULE_NAME_PASCAL}}Repository } from '../infra/{{EXAMPLE_MODULE_NAME}}.repository.pg.js';

const router = Router();
const repo = new Pg{{EXAMPLE_MODULE_NAME_PASCAL}}Repository();

const createSchema = z.object({ title: z.string(), description: z.string().default('') });
const updateSchema = z.object({ title: z.string().optional(), description: z.string().optional(), status: z.enum(['pending', 'done']).optional() });

router.get('/', requirePermission('{{EXAMPLE_MODULE_NAME}}.view'), async (_req: Request, res: Response) => {
  const items = await withTransaction((tx) => repo.listAll(tx));
  res.json(items);
});

router.get('/:id', requirePermission('{{EXAMPLE_MODULE_NAME}}.view'), async (req: Request<{ id: string }>, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  const item = await withTransaction((tx) => repo.findById(tx, id));
  if (!item) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.json(item);
});

router.post('/', requirePermission('{{EXAMPLE_MODULE_NAME}}.create'), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  const titleError = validateTitle(parsed.data.title);
  if (titleError) { res.status(400).json({ error: titleError }); return; }
  const item = await withTransaction((tx) => repo.create(tx, parsed.data));
  res.status(201).json(item);
});

router.put('/:id', requirePermission('{{EXAMPLE_MODULE_NAME}}.edit'), async (req: Request<{ id: string }>, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  const item = await withTransaction((tx) => repo.update(tx, id, parsed.data));
  if (!item) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.json(item);
});

router.delete('/:id', requirePermission('{{EXAMPLE_MODULE_NAME}}.delete'), async (req: Request<{ id: string }>, res: Response) => {
  const id = Number.parseInt(req.params.id, 10);
  const deleted = await withTransaction((tx) => repo.deleteById(tx, id));
  if (!deleted) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.status(204).end();
});

export default router;
