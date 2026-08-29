import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface SessionPayload {
  sub: number;
  email: string;
  permissions: string[];
}

const TTL = '8h'; // Fijo, sin refresh en v1 — ver requirements.md §3.

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.AUTH_JWT_SECRET, { expiresIn: TTL });
}

export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, env.AUTH_JWT_SECRET);
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).sub !== 'number' ||
    typeof (decoded as Record<string, unknown>).email !== 'string' ||
    !Array.isArray((decoded as Record<string, unknown>).permissions)
  ) {
    throw new Error('JWT payload con forma inesperada');
  }
  return decoded as unknown as SessionPayload;
}
