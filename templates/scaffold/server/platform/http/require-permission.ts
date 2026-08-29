import type { Request, Response, NextFunction } from 'express';

export function requirePermission(code: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.permissions.includes(code)) {
      res.status(403).json({ error: `Falta el permiso ${code}` });
      return;
    }
    next();
  };
}
