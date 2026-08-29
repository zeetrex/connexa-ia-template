import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: z.enum(['require', 'disable', 'verify-full']).default('require'),
  PORT: z.coerce.number().int().positive().default(3001),
  AUTH_JWT_SECRET: z.string().min(32, 'AUTH_JWT_SECRET debe tener al menos 32 caracteres'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

export const env = loadEnv();
