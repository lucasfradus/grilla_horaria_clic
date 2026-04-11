import type { DragEvent } from 'react'

export type Profesor = {
  id: number
  nombre: string
  email: string | null
}

export type Actividad = {
  id: number
  nombre: string
  descripcion: string | null
  cupo: number
  es_hot: boolean
}

export type AppConfig = {
  ocultar_profesor_vista_publica: boolean
}

export type ClaseHorario = {
  id: number
  dia_semana: number
  hora_inicio: string
  hora_fin: string
  profesor_id: number | null
  actividad_id: number | null
  profesor: Profesor | null
  actividad: Actividad | null
}

export const DIAS: { value: number; label: string }[] = [
  { value: 0, label: 'Lun' },
  { value: 1, label: 'Mar' },
  { value: 2, label: 'Mié' },
  { value: 3, label: 'Jue' },
  { value: 4, label: 'Vie' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },
]

export type DragPayload = { kind: 'profesor' | 'actividad'; id: number }

export const DRAG_MIME = 'application/hotclic-drag'

export function parseDragPayload(e: DragEvent): DragPayload | null {
  const raw = e.dataTransfer.getData(DRAG_MIME)
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as DragPayload
    if (o.kind !== 'profesor' && o.kind !== 'actividad') return null
    if (typeof o.id !== 'number') return null
    return o
  } catch {
    return null
  }
}
