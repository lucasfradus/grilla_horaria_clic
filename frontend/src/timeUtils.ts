/** Convierte "HH:mm" o "HH:mm:ss" a minutos desde medianoche. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Minutos → "HH:mm" para inputs type="time". */
export function minutesToTimeInput(total: number): string {
  const clamped = Math.max(0, Math.min(total, 24 * 60 - 1))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Siguiente franja consecutiva: empieza donde terminó la última,
 * misma duración (ej. 07:45–08:45 → 08:45–09:45).
 */
export function nextConsecutiveFranja(last: { inicio: string; fin: string }): {
  inicio: string
  fin: string
} {
  const startLast = timeToMinutes(last.inicio)
  const endLast = timeToMinutes(last.fin)
  let dur = endLast - startLast
  if (dur <= 0) dur = 60

  let start = endLast
  let end = start + dur
  const dayEnd = 24 * 60 - 1
  if (end > dayEnd) {
    end = dayEnd
    start = Math.max(0, end - dur)
  }
  return {
    inicio: minutesToTimeInput(start),
    fin: minutesToTimeInput(end),
  }
}
