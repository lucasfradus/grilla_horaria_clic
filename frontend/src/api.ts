import type { Actividad, AppConfig, ClaseHorario, Profesor } from './types'

/**
 * Base del API. Si `VITE_API_URL` está vacío o no existe:
 * - en desarrollo: `/api` (proxy de Vite → backend, evita CORS y el 405 al pegarle al puerto 5173)
 * - en build: `http://127.0.0.1:8000` (definí VITE_API_URL en producción)
 */
function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  let custom = ''
  if (raw != null && String(raw).trim() !== '') {
    custom = String(raw).trim().replace(/\/$/, '')
  }
  // "/" o solo barra final → base vacía: fetch relativo pega al puerto de Vite → 405 en POST
  if (custom !== '') {
    return custom
  }
  if (import.meta.env.DEV) {
    return '/api'
  }
  // En deploy (Railway), frontend y API viven bajo el mismo dominio.
  return ''
}

const base = getApiBase()

async function req<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (r.status === 204) return undefined as T
  if (!r.ok) {
    let detail = r.statusText
    try {
      const j = await r.json()
      if (j.detail) detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return r.json() as Promise<T>
}

export const api = {
  health: () => req<{ ok: boolean }>('/health'),
  config: {
    get: () => req<AppConfig>('/config'),
    update: (body: { ocultar_profesor_vista_publica?: boolean }) =>
      req<AppConfig>('/config', { method: 'POST', body: JSON.stringify(body) }),
  },
  profesores: {
    list: () => req<Profesor[]>('/profesores'),
    create: (body: { nombre: string; email?: string | null }) =>
      req<Profesor>('/profesores', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: number) =>
      req<void>(`/profesores/${id}`, { method: 'DELETE' }),
  },
  actividades: {
    list: () => req<Actividad[]>('/actividades'),
    create: (body: {
      nombre: string
      descripcion?: string | null
      cupo: number
      es_hot?: boolean
    }) => req<Actividad>('/actividades', { method: 'POST', body: JSON.stringify(body) }),
    /** POST (y PATCH en el server) para evitar 405 detrás de algunos proxies / SPA. */
    update: (
      id: number,
      body: Partial<{
        nombre: string
        descripcion: string | null
        cupo: number
        es_hot: boolean
      }>,
    ) =>
      req<Actividad>(`/actividades/${id}`, { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: number) =>
      req<void>(`/actividades/${id}`, { method: 'DELETE' }),
  },
  clases: {
    list: () => req<ClaseHorario[]>('/clases'),
    createVacia: (body: {
      dia_semana: number
      hora_inicio: string
      hora_fin: string
    }) => req<ClaseHorario>('/clases', { method: 'POST', body: JSON.stringify(body) }),
    bulkRecurrencia: (body: {
      dias_semana: number[]
      franjas: { hora_inicio: string; hora_fin: string }[]
    }) =>
      req<ClaseHorario[]>('/clases/bulk-recurrencia', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    patch: (id: number, body: { profesor_id?: number | null; actividad_id?: number | null }) =>
      req<ClaseHorario>(`/clases/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: number) =>
      req<void>(`/clases/${id}`, { method: 'DELETE' }),
  },
  seedDemo: (token: string, replace: boolean) =>
    req<{ profesores: number; actividades: number; clases: number; replace: boolean }>(
      '/admin/seed',
      {
        method: 'POST',
        headers: { 'X-Seed-Token': token },
        body: JSON.stringify({ replace }),
      },
    ),
}
