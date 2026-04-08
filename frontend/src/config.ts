/**
 * Ruta de administración: definí `VITE_ADMIN_PATH` en `.env` (ej. `.env.local`).
 * Valor por defecto solo para desarrollo; en producción conviene una ruta propia y guardarla.
 */
export const ADMIN_PATH =
  (import.meta.env.VITE_ADMIN_PATH as string | undefined)?.replace(/\/$/, '') ||
  '/x9k2m7p4-w1n8hc-admin'
