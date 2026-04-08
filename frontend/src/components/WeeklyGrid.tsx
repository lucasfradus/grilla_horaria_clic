import { useMemo, useState, type DragEvent } from 'react'
import type { ClaseHorario } from '../types'
import { DIAS, DRAG_MIME, parseDragPayload, type DragPayload } from '../types'
import {
  GRID_END,
  GRID_START,
  NUM_SLOTS,
  ROW_PX,
  SLOT_MINUTES,
  minutesFromTime,
  slotRangeLabel,
} from '../scheduleConstants'

type Variant = 'admin' | 'public'

const classes: Record<
  Variant,
  {
    wrap: string
    grid: string
    corner: string
    dayHead: string
    timeGutter: string
    dayColumn: string
    block: string
    blockMeta: string
    blockTime: string
  }
> = {
  admin: {
    wrap: 'schedule-wrap',
    grid: 'schedule-grid',
    corner: 'corner',
    dayHead: 'day-head',
    timeGutter: 'time-gutter',
    dayColumn: 'day-column',
    block: 'block',
    blockMeta: 'block-meta',
    blockTime: 'block-time',
  },
  public: {
    wrap: 'pub-schedule-wrap',
    grid: 'pub-schedule-grid',
    corner: 'pub-corner',
    dayHead: 'pub-day-head',
    timeGutter: 'pub-time-gutter',
    dayColumn: 'pub-day-column',
    block: 'pub-block',
    blockMeta: 'pub-block-meta',
    blockTime: 'pub-block-time',
  },
}

export function WeeklyGrid({
  clases,
  variant,
  onDropOnClase,
  onClearProfesor,
  onClearActividad,
  onDeleteClase,
}: {
  clases: ClaseHorario[]
  variant: Variant
  onDropOnClase?: (claseId: number, payload: DragPayload) => void
  onClearProfesor?: (claseId: number) => void
  onClearActividad?: (claseId: number) => void
  onDeleteClase?: (claseId: number) => void
}) {
  const c = classes[variant]
  const [dropOverId, setDropOverId] = useState<number | null>(null)
  const adminDnD = variant === 'admin' && Boolean(onDropOnClase)

  const clasesPorDia = useMemo(() => {
    const m: Record<number, ClaseHorario[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    }
    for (const cl of clases) {
      m[cl.dia_semana]?.push(cl)
    }
    return m
  }, [clases])

  function blockClass(cl: ClaseHorario): string {
    const parts = [c.block]
    if (variant === 'public') return parts.join(' ')
    const hasA = cl.actividad != null
    const hasP = cl.profesor != null
    if (!hasA && !hasP) parts.push('block--empty')
    else if (!hasA || !hasP) parts.push('block--partial')
    if (adminDnD && dropOverId === cl.id) parts.push('block--drop-target')
    return parts.join(' ')
  }

  function blockTitle(cl: ClaseHorario): string {
    const a = cl.actividad?.nombre ?? 'Sin actividad'
    const p = cl.profesor?.nombre ?? 'Sin profesor'
    return `${a} · ${p}`
  }

  function renderBlockBody(cl: ClaseHorario) {
    const act = cl.actividad
    const prof = cl.profesor
    if (variant === 'public') {
      if (act && prof) {
        return (
          <>
            <strong>{act.nombre}</strong>
            <span className={c.blockMeta}>
              {prof.nombre} · cupo {act.cupo}
            </span>
            <span className={c.blockTime}>
              {cl.hora_inicio.slice(0, 5)}–{cl.hora_fin.slice(0, 5)}
            </span>
          </>
        )
      }
      if (act && !prof) {
        return (
          <>
            <strong>{act.nombre}</strong>
            <span className={c.blockMeta}>Profesor a confirmar · cupo {act.cupo}</span>
            <span className={c.blockTime}>
              {cl.hora_inicio.slice(0, 5)}–{cl.hora_fin.slice(0, 5)}
            </span>
          </>
        )
      }
      if (!act && prof) {
        return (
          <>
            <strong>Actividad pendiente</strong>
            <span className={c.blockMeta}>{prof.nombre}</span>
            <span className={c.blockTime}>
              {cl.hora_inicio.slice(0, 5)}–{cl.hora_fin.slice(0, 5)}
            </span>
          </>
        )
      }
      return (
        <>
          <strong>Franja</strong>
          <span className={c.blockMeta}>Horario a confirmar</span>
          <span className={c.blockTime}>
            {cl.hora_inicio.slice(0, 5)}–{cl.hora_fin.slice(0, 5)}
          </span>
        </>
      )
    }

    /* admin */
    return (
      <>
        <strong>{act?.nombre ?? '— Actividad —'}</strong>
        <span className={c.blockMeta}>
          {prof?.nombre ?? '— Profesor —'}
          {act ? ` · cupo ${act.cupo}` : ''}
        </span>
        <span className={c.blockTime}>
          {cl.hora_inicio.slice(0, 5)}–{cl.hora_fin.slice(0, 5)}
        </span>
      </>
    )
  }

  return (
    <div className={c.wrap}>
      <div
        className={c.grid}
        style={{
          gridTemplateRows: `auto repeat(${NUM_SLOTS}, ${ROW_PX}px)`,
        }}
      >
        <div className={c.corner} style={{ gridColumn: 1, gridRow: 1 }} />
        {DIAS.map((d) => (
          <div
            key={d.value}
            className={c.dayHead}
            style={{ gridColumn: d.value + 2, gridRow: 1 }}
          >
            {d.label}
          </div>
        ))}
        {Array.from({ length: NUM_SLOTS }, (_, i) => (
          <div
            key={`t-${i}`}
            className={c.timeGutter}
            style={{ gridColumn: 1, gridRow: i + 2 }}
          >
            {slotRangeLabel(i)}
          </div>
        ))}
        {DIAS.map((d) => (
          <div
            key={`col-${d.value}`}
            className={c.dayColumn}
            style={{
              gridColumn: d.value + 2,
              gridRow: `2 / span ${NUM_SLOTS}`,
            }}
          >
            {clasesPorDia[d.value]?.map((cl) => {
              const start = minutesFromTime(cl.hora_inicio)
              const end = minutesFromTime(cl.hora_fin)
              if (end <= GRID_START || start >= GRID_END) return null
              const top = Math.max(0, (start - GRID_START) / SLOT_MINUTES) * ROW_PX
              const h =
                (Math.min(end, GRID_END) - Math.max(start, GRID_START)) /
                SLOT_MINUTES *
                ROW_PX
              if (h <= 0) return null
              return (
                <article
                  key={cl.id}
                  className={blockClass(cl)}
                  style={{ top, height: Math.max(h, ROW_PX * 0.75) }}
                  title={blockTitle(cl)}
                  onDragOver={
                    adminDnD
                      ? (e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'copy'
                          setDropOverId(cl.id)
                        }
                      : undefined
                  }
                  onDragLeave={
                    adminDnD
                      ? () => {
                          setDropOverId((cur) => (cur === cl.id ? null : cur))
                        }
                      : undefined
                  }
                  onDrop={
                    adminDnD && onDropOnClase
                      ? (e) => {
                          e.preventDefault()
                          setDropOverId(null)
                          const payload = parseDragPayload(e)
                          if (payload) onDropOnClase(cl.id, payload)
                        }
                      : undefined
                  }
                >
                  {variant === 'admin' && onDeleteClase ? (
                    <div className="block-toolbar">
                      <button
                        type="button"
                        className="block-tool-btn"
                        title="Quitar franja"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('¿Eliminar esta franja de la grilla?')) onDeleteClase(cl.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  {variant === 'admin' && (onClearActividad || onClearProfesor) ? (
                    <div className="block-clear-row">
                      {cl.actividad && onClearActividad ? (
                        <button
                          type="button"
                          className="block-mini-clear"
                          title="Quitar actividad"
                          onClick={(e) => {
                            e.stopPropagation()
                            onClearActividad(cl.id)
                          }}
                        >
                          Act. ×
                        </button>
                      ) : null}
                      {cl.profesor && onClearProfesor ? (
                        <button
                          type="button"
                          className="block-mini-clear"
                          title="Quitar profesor"
                          onClick={(e) => {
                            e.stopPropagation()
                            onClearProfesor(cl.id)
                          }}
                        >
                          Prof. ×
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {renderBlockBody(cl)}
                </article>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function setDragPayload(e: DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'copy'
}
