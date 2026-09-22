// Vercel invoca el export default como handler. Sin él la función no tiene
// punto de entrada; sin los rewrites de vercel.json, sólo `/api` exacto llega
// acá y cualquier subruta (`/api/auth/google`) da 404.
export { app as default } from '../server/index.js';
