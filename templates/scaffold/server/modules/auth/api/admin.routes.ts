import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { withTransaction } from '../../../platform/db/unit-of-work.js';
import { requirePermission } from '../../../platform/http/require-permission.js';
import { ProtectedRoleError, RoleInUseError } from '../domain/errors.js';
import { PgRoleRepository } from '../infra/role.repository.pg.js';
import { PgUserRepository } from '../infra/user.repository.pg.js';

const router = Router();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

function sendError(res: Response, status: number, message: string, route: string, err: unknown) {
  console.error(`${route} error:`, err);
  res.status(status).json({ error: message });
}

router.get('/users', requirePermission('user.view'), async (_req: Request, res: Response) => {
  try {
    const users = await withTransaction((tx) => userRepo.listUsers(tx));
    res.json(users);
  } catch (err) {
    sendError(res, 500, 'Error al listar usuarios', 'GET /api/admin/users', err);
  }
});

const patchUserSchema = z.object({
  active: z.boolean().optional(),
  roleIds: z.array(z.number().int().positive()).optional(),
});

router.patch('/users/:id', requirePermission('user.edit'), async (req: Request<{ id: string }>, res: Response) => {
  const userId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(userId)) { res.status(400).json({ error: 'id inválido' }); return; }
  const parsed = patchUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  try {
    await withTransaction(async (tx) => {
      if (parsed.data.active != null) await userRepo.setActive(tx, userId, parsed.data.active);
      if (parsed.data.roleIds != null) await userRepo.setRoles(tx, userId, parsed.data.roleIds);
    });
    const users = await withTransaction((tx) => userRepo.listUsers(tx));
    const updated = users.find((u) => u.id === userId);
    if (!updated) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    res.json(updated);
  } catch (err) {
    sendError(res, 500, 'Error al actualizar el usuario', 'PATCH /api/admin/users/:id', err);
  }
});

router.get('/roles', requirePermission('role.view'), async (_req: Request, res: Response) => {
  try {
    const roles = await withTransaction((tx) => roleRepo.listRoles(tx));
    res.json(roles);
  } catch (err) {
    sendError(res, 500, 'Error al listar roles', 'GET /api/admin/roles', err);
  }
});

const roleBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  permissionCodes: z.array(z.string()),
});

async function validatePermissionCodes(codes: string[]): Promise<string[]> {
  const catalog = new Set(await withTransaction((tx) => roleRepo.listPermissionCodes(tx)));
  return codes.filter((c) => !catalog.has(c));
}

router.post('/roles', requirePermission('role.create'), async (req: Request, res: Response) => {
  const parsed = roleBodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  const unknown = await validatePermissionCodes(parsed.data.permissionCodes);
  if (unknown.length > 0) { res.status(400).json({ error: `Códigos de permiso desconocidos: ${unknown.join(', ')}` }); return; }
  try {
    const role = await withTransaction((tx) => roleRepo.createRole(tx, parsed.data));
    res.status(201).json(role);
  } catch (err) {
    sendError(res, 500, 'Error al crear el rol', 'POST /api/admin/roles', err);
  }
});

const roleUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissionCodes: z.array(z.string()).optional(),
});

router.put('/roles/:id', requirePermission('role.edit'), async (req: Request<{ id: string }>, res: Response) => {
  const roleId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(roleId)) { res.status(400).json({ error: 'id inválido' }); return; }
  const parsed = roleUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Body inválido', detail: parsed.error.issues }); return; }
  if (parsed.data.permissionCodes != null) {
    const unknown = await validatePermissionCodes(parsed.data.permissionCodes);
    if (unknown.length > 0) { res.status(400).json({ error: `Códigos de permiso desconocidos: ${unknown.join(', ')}` }); return; }
  }
  try {
    const role = await withTransaction((tx) => roleRepo.updateRole(tx, roleId, parsed.data));
    res.json(role);
  } catch (err) {
    if (err instanceof ProtectedRoleError) { res.status(403).json({ error: err.message }); return; }
    sendError(res, 500, 'Error al actualizar el rol', 'PUT /api/admin/roles/:id', err);
  }
});

router.delete('/roles/:id', requirePermission('role.delete'), async (req: Request<{ id: string }>, res: Response) => {
  const roleId = Number.parseInt(req.params.id, 10);
  if (!Number.isFinite(roleId)) { res.status(400).json({ error: 'id inválido' }); return; }
  try {
    await withTransaction((tx) => roleRepo.deleteRole(tx, roleId));
    res.status(204).end();
  } catch (err) {
    if (err instanceof ProtectedRoleError) { res.status(403).json({ error: err.message }); return; }
    if (err instanceof RoleInUseError) { res.status(409).json({ error: err.message }); return; }
    sendError(res, 500, 'Error al borrar el rol', 'DELETE /api/admin/roles/:id', err);
  }
});

router.get('/permissions', requirePermission('role.view'), async (_req: Request, res: Response) => {
  try {
    const rows = await withTransaction((tx) => roleRepo.listPermissions(tx));
    res.json(rows);
  } catch (err) {
    sendError(res, 500, 'Error al listar permisos', 'GET /api/admin/permissions', err);
  }
});

export default router;
