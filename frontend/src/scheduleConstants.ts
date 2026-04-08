export const GRID_START = 7 * 60
export const GRID_END = 22 * 60
export const SLOT_MINUTES = 30
export const ROW_PX = 36
export const NUM_SLOTS = (GRID_END - GRID_START) / SLOT_MINUTES

export function minutesFromTime(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function timeToLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function slotRangeLabel(slotIndex: number): string {
  const a = GRID_START + slotIndex * SLOT_MINUTES
  const b = a + SLOT_MINUTES
  return `${timeToLabel(a)}–${timeToLabel(b)}`
}
