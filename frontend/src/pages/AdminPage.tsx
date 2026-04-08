import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { WeeklyGrid } from '../components/WeeklyGrid'
import { api } from '../api'
import type { Actividad, ClaseHorario, Profesor } from '../types'
import { DIAS } from '../types'
import { nextConsecutiveFranja } from '../timeUtils'
import '../App.css'

export function AdminPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [clases, setClases] = useState<ClaseHorario[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setErr(null)
    try {
      const [p, a, c] = await Promise.all([
        api.profesores.list(),
        api.actividades.list(),
        api.clases.list(),
      ])
      setProfesores(p)
      setActividades(a)
      setClases(c)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const onAssignProfesor = useCallback(
    async (claseId: number, profesorId: number | null) => {
      try {
        await api.clases.patch(claseId, { profesor_id: profesorId })
        await refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error al asignar profesor')
      }
    },
    [refresh],
  )

  const onAssignActividad = useCallback(
    async (claseId: number, actividadId: number | null) => {
      try {
        await api.clases.patch(claseId, { actividad_id: actividadId })
        await refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error al asignar actividad')
      }
    },
    [refresh],
  )

  const onClearProfesor = useCallback(
    async (claseId: number) => {
      try {
        await api.clases.patch(claseId, { profesor_id: null })
        await refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error')
      }
    },
    [refresh],
  )

  const onClearActividad = useCallback(
    async (claseId: number) => {
      try {
        await api.clases.patch(claseId, { actividad_id: null })
        await refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error')
      }
    },
    [refresh],
  )

  const onDeleteClase = useCallback(
    async (claseId: number) => {
      try {
        await api.clases.remove(claseId)
        await refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error')
      }
    },
    [refresh],
  )

  const publicUrls = useMemo(() => {
    if (typeof window === 'undefined') {
      return { home: '/', horarios: '/horarios' }
    }
    const o = window.location.origin
    return {
      home: new URL('/', o).href,
      horarios: new URL('/horarios', o).href,
    }
  }, [])

  return (
    <div className="app app--admin-flow">
      <header className="header admin-header-card">
        <p className="admin-eyebrow">Hot Clic · administración</p>
        <h1>Horarios</h1>
        <p className="subtitle">
          Primero generá franjas vacías (recurrentes o una puntual). Luego asigná actividad y
          profesor directamente en cada bloque de la grilla.
        </p>
        <div className="admin-header-actions">
          <Link to="/" className="btn btn-secondary btn-sm">
            Ver grilla pública
          </Link>
        </div>
        <p className="admin-share-line muted small">
          Compartí: <code>{publicUrls.home}</code> · <code>{publicUrls.horarios}</code>
        </p>
      </header>

      {err && (
        <div className="banner error" role="alert">
          {err}
          <p className="hint">
            Si actualizaste el backend, borrá <code>backend/horarios.db</code> y volvé a levantar la
            API. ¿Corre uvicorn? <code>uvicorn app.main:app --reload</code>
          </p>
        </div>
      )}

      {loading ? (
        <p className="admin-loading muted">Cargando…</p>
      ) : null}

      <div className="admin-workspace">
        <div className="admin-main-col">
          <section className="panel panel--accent">
            <h2 className="panel-title">Franjas recurrentes</h2>
            <p className="muted small">
              Elegí días y horarios (ej. 7–8, 8–9). Se crean franjas vacías en todas las
              combinaciones. Las que ya existen se omiten.
            </p>
            <FormRecurrencia onCreated={() => void refresh()} />
          </section>

          <section className="panel">
            <h2 className="panel-title">Agregar una franja</h2>
            <p className="muted small">Un solo día y horario, sin profesor ni actividad.</p>
            <FormUnaFranja onCreated={() => void refresh()} />
          </section>

          <section className="panel panel--grid">
            <h2 className="panel-title">Grilla semanal</h2>
            <WeeklyGrid
              clases={clases}
              variant="admin"
              profesores={profesores}
              actividades={actividades}
              onAssignProfesor={onAssignProfesor}
              onAssignActividad={onAssignActividad}
              onClearProfesor={onClearProfesor}
              onClearActividad={onClearActividad}
              onDeleteClase={onDeleteClase}
            />
          </section>
        </div>

        <aside className="admin-sidebar" aria-label="Datos base">
          <div className="sidebar-sticky">
            <SidebarProfesores
              profesores={profesores}
              onCreated={() => void refresh()}
              onRemoved={() => void refresh()}
            />
            <SidebarActividades
              actividades={actividades}
              onCreated={() => void refresh()}
              onRemoved={() => void refresh()}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

function FormRecurrencia({ onCreated }: { onCreated: () => void }) {
  const [diasSel, setDiasSel] = useState<number[]>([0, 1, 2, 3, 4])
  const [franjas, setFranjas] = useState<{ inicio: string; fin: string }[]>([
    { inicio: '07:00', fin: '08:00' },
    { inicio: '08:00', fin: '09:00' },
  ])
  const [busy, setBusy] = useState(false)

  function toggleDia(d: number) {
    setDiasSel((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (diasSel.length === 0) {
      alert('Elegí al menos un día')
      return
    }
    setBusy(true)
    try {
      await api.clases.bulkRecurrencia({
        dias_semana: diasSel,
        franjas: franjas.map((f) => ({
          hora_inicio: normalizeTimeForApi(f.inicio),
          hora_fin: normalizeTimeForApi(f.fin),
        })),
      })
      onCreated()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form recurrencia-form" onSubmit={submit}>
      <fieldset className="dias-fieldset">
        <legend className="small">Días</legend>
        <div className="dias-chips">
          {DIAS.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`dia-chip ${diasSel.includes(d.value) ? 'dia-chip--on' : ''}`}
              onClick={() => toggleDia(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="franjas-editor">
        <span className="small muted">Horarios (desde / hasta)</span>
        {franjas.map((f, i) => (
          <div key={i} className="franja-row">
            <label className="franja-time-label">
              <span className="sr-only">Desde</span>
              <input
                type="time"
                value={f.inicio}
                onChange={(e) => {
                  const next = [...franjas]
                  next[i] = { ...next[i], inicio: e.target.value }
                  setFranjas(next)
                }}
                required
              />
            </label>
            <span className="franja-arrow" aria-hidden>
              →
            </span>
            <label className="franja-time-label">
              <span className="sr-only">Hasta</span>
              <input
                type="time"
                value={f.fin}
                onChange={(e) => {
                  const next = [...franjas]
                  next[i] = { ...next[i], fin: e.target.value }
                  setFranjas(next)
                }}
                required
              />
            </label>
            {franjas.length > 1 ? (
              <button
                type="button"
                className="btn btn-icon danger-soft"
                title="Quitar franja"
                onClick={() => setFranjas(franjas.filter((_, j) => j !== i))}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-add-franja"
          onClick={() =>
            setFranjas((prev) => [...prev, nextConsecutiveFranja(prev[prev.length - 1])])
          }
        >
          + Agregar franja horaria
        </button>
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Generando…' : 'Generar franjas vacías'}
      </button>
    </form>
  )
}

function FormUnaFranja({ onCreated }: { onCreated: () => void }) {
  const [dia, setDia] = useState(0)
  const [inicio, setInicio] = useState('09:00')
  const [fin, setFin] = useState('10:00')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.clases.createVacia({
        dia_semana: dia,
        hora_inicio: normalizeTimeForApi(inicio),
        hora_fin: normalizeTimeForApi(fin),
      })
      onCreated()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form row-form row-form--una-franja" onSubmit={submit}>
      <label>
        Día
        <select value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {DIAS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Desde
        <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
      </label>
      <label>
        Hasta
        <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} required />
      </label>
      <button type="submit" className="btn btn-secondary" disabled={busy}>
        Agregar franja
      </button>
    </form>
  )
}

function SidebarProfesores({
  profesores,
  onCreated,
  onRemoved,
}: {
  profesores: Profesor[]
  onCreated: () => void
  onRemoved: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setBusy(true)
    try {
      await api.profesores.create({
        nombre: nombre.trim(),
        email: email.trim() || null,
      })
      setNombre('')
      setEmail('')
      onCreated()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel sidebar-panel">
      <h2 className="panel-title panel-title--sm">Profesores</h2>
      <p className="muted small">Creá y administrá profesores.</p>
      <form onSubmit={submit} className="form compact-form">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nuevo profesor"
          maxLength={120}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (opc.)"
        />
        <button type="submit" disabled={busy} className="btn btn-small btn-primary" title="Agregar">
          +
        </button>
      </form>
      <ul className="dnd-list">
        {profesores.map((p) => (
          <li key={p.id}>
            <div className="dnd-chip dnd-chip--prof">
              {p.nombre}
            </div>
            <button
              type="button"
              className="btn btn-icon danger-soft"
              title="Eliminar"
              onClick={async () => {
                if (!confirm('¿Eliminar este profesor?')) return
                await api.profesores.remove(p.id)
                onRemoved()
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SidebarActividades({
  actividades,
  onCreated,
  onRemoved,
}: {
  actividades: Actividad[]
  onCreated: () => void
  onRemoved: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [cupo, setCupo] = useState(10)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setBusy(true)
    try {
      await api.actividades.create({
        nombre: nombre.trim(),
        descripcion: null,
        cupo,
      })
      setNombre('')
      setCupo(10)
      onCreated()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel sidebar-panel">
      <h2 className="panel-title panel-title--sm">Actividades</h2>
      <p className="muted small">Creá y administrá actividades (con cupo).</p>
      <form onSubmit={submit} className="form compact-form">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nueva actividad"
          maxLength={200}
        />
        <input
          type="number"
          min={1}
          max={500}
          value={cupo}
          onChange={(e) => setCupo(Number(e.target.value))}
          title="Cupo"
          className="input-cupo"
        />
        <button type="submit" disabled={busy} className="btn btn-small btn-primary" title="Agregar">
          +
        </button>
      </form>
      <ul className="dnd-list">
        {actividades.map((a) => (
          <li key={a.id}>
            <div className="dnd-chip dnd-chip--act">
              <span>{a.nombre}</span>
              <span className="dnd-chip-cupo">cupo {a.cupo}</span>
            </div>
            <button
              type="button"
              className="btn btn-icon danger-soft"
              title="Eliminar"
              onClick={async () => {
                if (!confirm('¿Eliminar esta actividad?')) return
                await api.actividades.remove(a.id)
                onRemoved()
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function normalizeTimeForApi(t: string): string {
  if (t.length === 5) return `${t}:00`
  return t
}
