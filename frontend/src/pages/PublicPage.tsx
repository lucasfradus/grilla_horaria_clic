import { useCallback, useEffect, useMemo, useState } from 'react'
import { WeeklyGrid } from '../components/WeeklyGrid'
import { api } from '../api'
import type { AppConfig, ClaseHorario } from '../types'
import { publicBrand } from '../publicBrand'
import '../publicPage.css'

export function PublicPage() {
  const [clases, setClases] = useState<ClaseHorario[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [actividadDestacadaId, setActividadDestacadaId] = useState<number | null>(null)
  const [soloHot, setSoloHot] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [c, cfg] = await Promise.all([
        api.clases.list(),
        api.config.get().catch(() => ({ ocultar_profesor_vista_publica: false })),
      ])
      setClases(c)
      setConfig(cfg)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudieron cargar los horarios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const clasesPublicas = useMemo(
    () => clases.filter((c) => c.actividad_id != null && c.profesor_id != null),
    [clases],
  )

  const clasesVista = useMemo(
    () =>
      clasesPublicas.filter((c) => {
        if (!soloHot) return true
        return c.actividad?.es_hot === true
      }),
    [clasesPublicas, soloHot],
  )

  useEffect(() => {
    setActividadDestacadaId((prev) => {
      if (prev == null) return null
      return clasesVista.some((c) => c.actividad_id === prev) ? prev : null
    })
  }, [clasesVista])

  const actividadesDisponibles = useMemo(() => {
    const map = new Map<number, { nombre: string; es_hot: boolean }>()
    for (const c of clasesVista) {
      const act = c.actividad
      if (act?.id != null) {
        map.set(act.id, { nombre: act.nombre, es_hot: act.es_hot === true })
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [clasesVista])

  return (
    <div className="pub-page">
      <header className="pub-hero">
        <div className="pub-hero-inner">
          <div className="pub-brand-block">
          <p className="pub-tagline">{publicBrand.tagline}</p>
            

            <div className="pub-brand-text">
              <h1 className="pub-title-stack">
                <span className="pub-title-name">{publicBrand.nombreCentro}</span>
              </h1>
              {publicBrand.eyebrow ? (
              <p className="pub-eyebrow">{publicBrand.eyebrow}</p>
            ) : null}
              {publicBrand.lineaMarca ? (
                <p className="pub-marca-line">{publicBrand.lineaMarca}</p>
              ) : null}
            </div>

          </div>
        </div>
      </header>

      <main className="pub-main">
        {err && (
          <div className="pub-banner" role="alert">
            {err}
          </div>
        )}
        {loading && <p className="pub-loading">Cargando horarios…</p>}

        {!loading && !err && clasesPublicas.length === 0 && (
          <p className="pub-empty">
            {clases.length > 0
              ? 'La grilla pública solo muestra clases con actividad y profesor asignados.'
              : 'Todavía no hay horarios en la grilla.'}
          </p>
        )}

        {!loading && !err && clasesPublicas.length > 0 ? (
          <>
            {clasesVista.length === 0 ? (
              <>
                <p className="pub-empty">
                  No hay clases Hot publicadas con actividad y profesor asignados.
                </p>
                <div className="pub-hot-bar">
                  <label className="pub-hot-toggle">
                    <input
                      type="checkbox"
                      checked={soloHot}
                      onChange={(e) => setSoloHot(e.target.checked)}
                    />
                    <span>Solo actividades Hot</span>
                  </label>
                </div>
              </>
            ) : (
              <section className="pub-panel" aria-label="Horarios semanales">
                <div className="pub-schedule-layout">
                  <div className="pub-desktop-layout">
                    <div className="pub-desktop-main">
                      <WeeklyGrid
                        clases={clasesVista}
                        variant="public"
                        ocultarProfesorVistaPublica={
                          config?.ocultar_profesor_vista_publica ?? false
                        }
                        actividadDestacadaId={actividadDestacadaId}
                      />
                    </div>
                    <aside className="pub-activity-filter" aria-label="Filtrar por actividad">
                      <p className="pub-activity-filter-title">Actividades</p>
                      <button
                        type="button"
                        className={`pub-activity-chip pub-activity-chip--all ${actividadDestacadaId == null ? 'is-active' : ''}`}
                        onClick={() => setActividadDestacadaId(null)}
                      >
                        Todas
                      </button>
                      {actividadesDisponibles.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={`pub-activity-chip ${a.es_hot ? 'pub-activity-chip--hot' : 'pub-activity-chip--cool'} ${actividadDestacadaId === a.id ? 'is-active' : ''}`}
                          onClick={() => setActividadDestacadaId(a.id)}
                        >
                          <span className="pub-activity-chip-label">{a.nombre}</span>
                          {a.es_hot ? (
                            <span className="pub-activity-hot" aria-hidden>
                              Hot
                            </span>
                          ) : null}
                        </button>
                      ))}
                      <div className="pub-hot-bar pub-hot-bar--in-aside">
                        <label className="pub-hot-toggle">
                          <input
                            type="checkbox"
                            checked={soloHot}
                            onChange={(e) => setSoloHot(e.target.checked)}
                          />
                          <span>Solo actividades Hot</span>
                        </label>
                      </div>
                    </aside>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : null}

        <p className="pub-footnote">{publicBrand.pie}</p>

      </main>

      <footer className="pub-footer">
        <span className="pub-footer-muted">Vista pública · solo lectura</span>
      </footer>
    </div>
  )
}
