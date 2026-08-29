import { Router, Request, Response } from 'express';
import type { CookieOptions } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../platform/config/env.js';
import { withTransaction } from '../../../platform/db/unit-of-work.js';
import { signSession } from '../../../platform/http/session.js';
import { authenticate } from '../../../platform/http/authenticate.js';
import { isAllowedEmail } from '../domain/allowed-domains.js';
import { PgUserRepository } from '../infra/user.repository.pg.js';
import type { AppUser } from '../ports/user.repository.js';

const router = Router();
const userRepo = new PgUserRepository();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const COOKIE_NAME = '{{PROJECT_NAME_PASCAL}}_session';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000,
};

function toUserJson(user: AppUser) {
  return { id: user.id, email: user.email, name: user.name, pictureUrl: user.pictureUrl };
}

// POST /api/auth/google — el filtro de dominio corre antes que cualquier
// otra cosa, sin excepción ni para el bootstrap del primer usuario.
router.post('/google', async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) {
    res.status(400).json({ error: 'Falta idToken' });
    return;
  }

  let email: string | undefined;
  let emailVerified = false;
  let googleSub: string | undefined;
  let name = '';
  let picture: string | null = null;

  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    const claims = ticket.getPayload();
    email = claims?.email;
    emailVerified = claims?.email_verified === true;
    googleSub = claims?.sub;
    name = claims?.name ?? '';
    picture = claims?.picture ?? null;
  } catch (err) {
    console.error('POST /api/auth/google — verifyIdToken falló:', err);
    res.status(401).json({ error: 'Token de Google inválido' });
    return;
  }

  if (!email || !googleSub) {
    res.status(401).json({ error: 'Token de Google inválido' });
    return;
  }

  if (!isAllowedEmail(email, emailVerified)) {
    res.status(403).json({ error: 'Dominio no autorizado' });
    return;
  }

  try {
    await withTransaction(async (tx) => {
      let user = await userRepo.findByGoogleSub(tx, googleSub!);
      if (!user) {
        const isFirst = await userRepo.isEmpty(tx);
        user = await userRepo.createUser(tx, { googleSub: googleSub!, email, name, pictureUrl: picture, active: isFirst });
        if (isFirst) {
          const adminRoleId = await userRepo.findRoleIdByName(tx, 'Admin');
          if (adminRoleId != null) await userRepo.assignRole(tx, user.id, adminRoleId);
        }
      }

      if (!user.active) {
        res.status(403).json({ error: 'Usuario inactivo, esperando activación' });
        return;
      }

      const permissions = await userRepo.resolvePermissions(tx, user.id);
      await userRepo.touchLastLogin(tx, user.id);
      const token = signSession({ sub: user.id, email: user.email, permissions });
      res.cookie(COOKIE_NAME, token, cookieOptions);
      res.json({ user: toUserJson(user), permissions });
    });
  } catch (err) {
    console.error('POST /api/auth/google error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.status(204).end();
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: { id: req.user!.id, email: req.user!.email }, permissions: req.user!.permissions });
});

export default router;
