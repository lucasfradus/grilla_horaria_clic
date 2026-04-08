import { useCallback, useEffect, useMemo, useState } from 'react'
import { WeeklyGrid } from '../components/WeeklyGrid'
import { api } from '../api'
import type { ClaseHorario } from '../types'
import { publicBrand } from '../publicBrand'
import '../publicPage.css'

export function PublicPage() {
  const [clases, setClases] = useState<ClaseHorario[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const c = await api.clases.list()
      setClases(c)
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

  const hasWordmark = Boolean(publicBrand.logoUrl?.trim())
  const hasMark = Boolean(publicBrand.logoMarkUrl?.trim())

  return (
    <div className="pub-page">
      <header className="pub-hero">
        <div className="pub-hero-inner">
          <div className="pub-brand-block">
            {publicBrand.eyebrow ? (
              <p className="pub-eyebrow">{publicBrand.eyebrow}</p>
            ) : null}

            <div className="pub-logo-row">
              {hasMark ? (
                <img
                  src={publicBrand.logoMarkUrl}
                  alt=""
                  className="pub-logo-mark-img"
                  width={80}
                  height={80}
                  decoding="async"
                />
              ) : null}
              {hasWordmark ? (
                <img
                  src={publicBrand.logoUrl}
                  alt={publicBrand.logoAlt}
                  className="pub-logo-wordmark"
                  decoding="async"
                />
              ) : (
                <span className="pub-logo-fallback" aria-hidden>
                  {publicBrand.logoTexto}
                </span>
              )}
            </div>

            <div className="pub-brand-text">
              <h1 className={`pub-title ${hasWordmark ? 'sr-only' : ''}`}>
                {publicBrand.nombreCentro}
              </h1>
              <p className="pub-tagline">{publicBrand.tagline}</p>
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
          <section className="pub-panel" aria-label="Grilla semanal">
            <WeeklyGrid clases={clasesPublicas} variant="public" />
          </section>
        ) : null}

        <p className="pub-footnote">{publicBrand.pie}</p>

        {publicBrand.manualUsuarioPath ? (
          <p className="pub-admin-hint">
            <a
              href={encodeURI(publicBrand.manualUsuarioPath)}
              target="_blank"
              rel="noopener noreferrer"
              className="pub-admin-link"
            >
              Manual de usuario
            </a>
          </p>
        ) : null}
      </main>

      <footer className="pub-footer">
        <span className="pub-footer-muted">Vista pública · solo lectura</span>
      </footer>
    </div>
  )
}
