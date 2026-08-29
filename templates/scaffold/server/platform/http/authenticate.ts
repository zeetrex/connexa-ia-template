import type { Request, Response, NextFunction } from 'express';
import { verifySession } from './session.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; permissions: string[] };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.{{PROJECT_NAME_PASCAL}}_session as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  try {
    const payload = verifySession(token);
    req.user = { id: payload.sub, email: payload.email, permissions: payload.permissions };
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o vencida' });
  }
}
