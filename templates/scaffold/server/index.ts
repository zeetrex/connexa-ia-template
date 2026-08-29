import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pool } from './platform/db/pool.js';
import { authenticate } from './platform/http/authenticate.js';
import { requirePermission } from './platform/http/require-permission.js';
import authRouter from './modules/auth/api/auth.routes.js';
import adminRouter from './modules/auth/api/admin.routes.js';
import {{EXAMPLE_MODULE_NAME}}Router from './modules/{{EXAMPLE_MODULE_NAME}}/api/{{EXAMPLE_MODULE_NAME}}.routes.js';
import { env } from './platform/config/env.js';

const app = express();

app.use(cookieParser());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

app.use('/api/auth', authRouter); // sin authenticate: acá se emite la sesión.

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api', authenticate); // todo lo que sigue exige sesión válida.
app.use('/api/admin', adminRouter);
app.use('/api/{{EXAMPLE_MODULE_PATH}}', {{EXAMPLE_MODULE_NAME}}Router);

app.get('/api/diagnostics', requirePermission('diagnostics.view'), async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS now, version() AS version');
    res.json({ status: 'ok', database: rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: (err as Error).message });
  }
});

// Exportado para que api/index.ts pueda reusar este mismo `app` en el
// bundling serverless de Vercel, sin arrastrar el .listen() — Vercel es
// quien maneja el ciclo de vida del proceso ahí, no este archivo.
export { app };

// .listen() sólo corre cuando este archivo es el entrypoint real del
// proceso (`npm run server`) — no cuando otro módulo lo importa sólo para
// tomar `app` (el caso de api/index.ts). Sin este guard, importar `app`
// desde otro lado dispara un segundo listener compitiendo por el puerto.
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  app.listen(env.PORT, () => console.log(`🚀 API server running on http://localhost:${env.PORT}`));
}
