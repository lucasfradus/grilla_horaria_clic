/**
 * Identidad HOT CLIC (manual de marca).
 * Logos: colocá PNG/SVG en `frontend/public/brand/` y actualizá las rutas.
 * - `logoUrl`: logo horizontal (recomendado para hero oscuro: versión clara / blanca).
 * - `logoMarkUrl`: isotipo opcional a la izquierda del horizontal.
 */
export const publicBrand = {
  eyebrow: 'HOT STUDIO & RECOVERY ROOM',
  nombreCentro: 'Hot Clic',
  tagline: 'Horarios semanales · cupos por clase',
  lineaMarca: 'Wellness club',
  pie: 'Consultá disponibilidad en recepción.',

  /** Logo horizontal (palabra completa). Reemplazá `logo-hero.svg` por tu export oficial. */
  logoUrl: '/brand/logo-hero.svg' as string,
  /** Isotipo / ícono; vacío para ocultar. */
  logoMarkUrl: '/brand/logo-mark.svg' as string,
  /** Texto alternativo del logo principal */
  logoAlt: 'Hot Clic',
  /** Si no hay `logoUrl`, se muestra este texto con estilo Bebas */
  logoTexto: 'HOT',

  manualUsuarioPath: '/Manual HOT CLIC.pdf',
}
