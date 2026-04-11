import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { WeeklyGrid } from '../components/WeeklyGrid'
import { api } from '../api'
import type { Actividad, AppConfig, ClaseHorario, Profesor } from '../types'
import { DIAS } from '../types'
import { publicBrand } from '../publicBrand'
import { nextConsecutiveFranja } from '../timeUtils'
import '../App.css'

export function AdminPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [clases, setClases] = useState<ClaseHorario[]>([])
  const [vistaPublicaConfig, setVistaPublicaConfig] = useState<AppConfig>({
    ocultar_profesor_vista_publica: false,
  })
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setErr(null)
    try {
      const [p, a, c, cfg] = await Promise.all([
        api.profesores.list(),
        api.actividades.list(),
        api.clases.list(),
        api.config.get().catch(() => null),
      ])
      setProfesores(p)
      setActividades(a)
      setClases(c)
      setVistaPublicaConfig(
        cfg ?? { ocultar_profesor_vista_publica: false },
      )
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
        <div className="admin-brand-block" aria-label="Marca">
          <p className="admin-brand-greet">{publicBrand.tituloSaludo}</p>
          <p className="admin-brand-name">
            {publicBrand.nombreCentro}
            <span className="admin-brand-suffix"> · administración</span>
          </p>
        </div>
        <h1>Horarios</h1>
        <p className="subtitle">
          Primero generá franjas vacías recurrentes. Luego asigná actividad y profesor
          directamente en cada bloque de la grilla.
        </p>
        <div className="admin-header-actions">
          <Link to="/" className="btn btn-secondary btn-sm">
            Ver grilla pública
          </Link>
          <a href="#admin-vista-publica-config" className="btn btn-ghost btn-sm">
            Ocultar profesora (vista pública)
          </a>
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

          <PanelCargaDemo onDone={() => void refresh()} />

          <section className="admin-abm-grid" aria-label="ABM de profesores y actividades">
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
          <SidebarVistaPublica
            config={vistaPublicaConfig}
            onUpdated={setVistaPublicaConfig}
          />
        </div>
      </div>
    </div>
  )
}

const SEED_TOKEN_STORAGE = 'horarios_seed_token'

function PanelCargaDemo({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem(SEED_TOKEN_STORAGE) ?? '' : '',
  )
  const [replace, setReplace] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastMsg, setLastMsg] = useState<string | null>(null)

  async function runSeed() {
    const t = token.trim()
    if (!t) {
      alert('Ingresá el token (variable SEED_SECRET_TOKEN en el servidor).')
      return
    }
    if (
      replace &&
      !confirm(
        'Se borrarán todas las clases, actividades y profesores y se cargará el paquete demo. ¿Continuar?',
      )
    ) {
      return
    }
    setBusy(true)
    setLastMsg(null)
    try {
      const r = await api.seedDemo(t, replace)
      sessionStorage.setItem(SEED_TOKEN_STORAGE, t)
      setLastMsg(
        `Listo: ${r.profesores} profes, ${r.actividades} actividades, ${r.clases} franjas${r.replace ? ' (reemplazo)' : ''}.`,
      )
      onDone()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel admin-seed-panel" aria-label="Carga de datos demo">
      <h2 className="panel-title">Carga inicial (demo)</h2>
      <p className="muted small">
        Inserta los profesores, actividades y horarios de la grilla de referencia (Lun–Vie mañana y
        tarde). En Railway definí <code>SEED_SECRET_TOKEN</code> y pegá el mismo valor abajo.
      </p>
      <div className="admin-seed-fields">
        <label className="admin-seed-token-label">
          <span>Token</span>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="SEED_SECRET_TOKEN"
          />
        </label>
        <label className="admin-config-check admin-seed-replace">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          <span>
            Reemplazar todo (borra clases, actividades y profesores antes de cargar). Usá esto si ya
            probaste franjas vacías o datos viejos.
          </span>
        </label>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void runSeed()}>
          {busy ? 'Cargando…' : 'Cargar datos demo'}
        </button>
      </div>
      {lastMsg ? <p className="admin-seed-msg muted small">{lastMsg}</p> : null}
    </section>
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

function SidebarVistaPublica({
  config,
  onUpdated,
}: {
  config: AppConfig
  onUpdated: (c: AppConfig) => void
}) {
  const [busy, setBusy] = useState(false)

  async function setOcultar(value: boolean) {
    setBusy(true)
    try {
      const next = await api.config.update({
        ocultar_profesor_vista_publica: value,
      })
      onUpdated(next)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar la configuración')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className="panel sidebar-panel"
      id="admin-vista-publica-config"
    >
      <h2 className="panel-title panel-title--sm">Vista pública</h2>
      <p className="muted small">
        Afecta solo la grilla que ven los visitantes (no el panel de administración).
      </p>
      <label className="admin-config-check">
        <input
          type="checkbox"
          checked={config.ocultar_profesor_vista_publica}
          disabled={busy}
          onChange={(e) => void setOcultar(e.target.checked)}
        />
        <span>Ocultar nombre de la profesora</span>
      </label>
    </section>
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
  const [descripcion, setDescripcion] = useState('')
  const [cupo, setCupo] = useState(10)
  const [esHot, setEsHot] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setBusy(true)
    try {
      await api.actividades.create({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        cupo,
        es_hot: esHot,
      })
      setNombre('')
      setDescripcion('')
      setCupo(10)
      setEsHot(false)
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
      <p className="muted small">Creá y administrá actividades con cupo y una descripción breve.</p>
      <form onSubmit={submit} className="form actividad-alta-form">
        <div className="actividad-alta-field">
          <label htmlFor="actividad-alta-nombre" className="actividad-alta-label">
            Nombre
          </label>
          <input
            id="actividad-alta-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Funcional mañana"
            maxLength={200}
            autoComplete="off"
          />
        </div>
        <div className="actividad-alta-field">
          <label htmlFor="actividad-alta-desc" className="actividad-alta-label">
            Descripción <span className="actividad-alta-label-optional">(opcional)</span>
          </label>
          <input
            id="actividad-alta-desc"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Texto corto que verán en la grilla"
            maxLength={500}
            autoComplete="off"
          />
        </div>
        <div className="actividad-alta-field actividad-alta-field--inline">
          <label htmlFor="actividad-alta-cupo" className="actividad-alta-label">
            Cupo
          </label>
          <input
            id="actividad-alta-cupo"
            type="number"
            min={1}
            max={500}
            value={cupo}
            onChange={(e) => setCupo(Number(e.target.value))}
            title="Plazas máximas para esta actividad"
            className="input-cupo"
          />
          <span className="actividad-alta-hint-inline muted small">personas por clase</span>
        </div>
        <div className="actividad-hot-block" role="group" aria-labelledby="actividad-alta-hot-title">
          <label className="actividad-hot-block__main">
            <input
              type="checkbox"
              checked={esHot}
              onChange={(e) => setEsHot(e.target.checked)}
              aria-describedby="actividad-alta-hot-desc"
            />
            <span className="actividad-hot-block__text">
              <span id="actividad-alta-hot-title" className="actividad-hot-block__title">
                Destacar como Hot
              </span>
              <span id="actividad-alta-hot-desc" className="actividad-hot-block__hint muted small">
                En la vista pública se muestra resaltada para que destaque entre el resto de actividades.
              </span>
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary actividad-alta-submit"
        >
          {busy ? 'Guardando…' : 'Guardar actividad'}
        </button>
      </form>
      <ul className="dnd-list">
        {actividades.map((a) => (
          <li key={a.id}>
            <div className="dnd-chip dnd-chip--act">
              <span className="dnd-chip-act-title">
                {a.nombre}
                {a.es_hot ? <span className="dnd-chip-hot">Hot</span> : null}
              </span>
              {a.descripcion ? (
                <span className="dnd-chip-desc">{a.descripcion}</span>
              ) : null}
              <span className="dnd-chip-cupo">cupo {a.cupo}</span>
            </div>
            <label className="admin-act-hot-row">
              <input
                type="checkbox"
                checked={a.es_hot === true}
                title="Hot: destacar en la vista pública"
                onChange={async (e) => {
                  const next = e.target.checked
                  try {
                    await api.actividades.update(a.id, { es_hot: next })
                    onCreated()
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Error')
                  }
                }}
              />
            </label>
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
