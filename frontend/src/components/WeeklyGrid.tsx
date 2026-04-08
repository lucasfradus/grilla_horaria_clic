import { useMemo } from 'react'
import type { ClaseHorario } from '../types'
import { DIAS } from '../types'
import type { Actividad, Profesor } from '../types'
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
  profesores = [],
  actividades = [],
  onAssignProfesor,
  onAssignActividad,
  onClearProfesor,
  onClearActividad,
  onDeleteClase,
}: {
  clases: ClaseHorario[]
  variant: Variant
  profesores?: Profesor[]
  actividades?: Actividad[]
  onAssignProfesor?: (claseId: number, profesorId: number | null) => void
  onAssignActividad?: (claseId: number, actividadId: number | null) => void
  onClearProfesor?: (claseId: number) => void
  onClearActividad?: (claseId: number) => void
  onDeleteClase?: (claseId: number) => void
}) {
  const c = classes[variant]

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
        {onAssignActividad ? (
          <select
            className="block-select"
            value={act?.id ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onAssignActividad(cl.id, v ? Number(v) : null)
            }}
          >
            <option value="">Actividad…</option>
            {actividades.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} (cupo {a.cupo})
              </option>
            ))}
          </select>
        ) : (
          <strong>{act?.nombre ?? '— Actividad —'}</strong>
        )}
        {onAssignProfesor ? (
          <select
            className="block-select"
            value={prof?.id ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onAssignProfesor(cl.id, v ? Number(v) : null)
            }}
          >
            <option value="">Profesor…</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        ) : (
          <span className={c.blockMeta}>
            {prof?.nombre ?? '— Profesor —'}
            {act ? ` · cupo ${act.cupo}` : ''}
          </span>
        )}
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
