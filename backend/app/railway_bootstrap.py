"""
Arranque en Railway (o cualquier Docker): opcionalmente importa un SQLite y aplica esquema.

Variables de entorno (opcionales):
  SQLITE_PATH          — destino del .db (ej. /data/horarios.db). Igual que en database.py.
  SQLITE_IMPORT_URL    — URL HTTPS (o HTTP) de un archivo .db para copiar al destino.
  SQLITE_IMPORT_OVERWRITE — si es 1/true/yes, reemplaza aunque ya exista un archivo con datos.

Sin SQLITE_IMPORT_URL solo ejecuta init_db() (create_all + migraciones), igual que al importar main.

Uso típico Railway:
  1. Volumen montado en /data, SQLITE_PATH=/data/horarios.db
  2. Subí tu horarios.db a un almacenamiento con URL firmada (temporal) y ponela en SQLITE_IMPORT_URL
  3. Primer deploy: importa. Sacá SQLITE_IMPORT_URL después para no pisar el volumen en cada reinicio.
"""

from __future__ import annotations

import os
import shutil
import tempfile
import urllib.error
import urllib.request
from pathlib import Path


def _resolve_sqlite_dest() -> Path:
    raw = os.environ.get("SQLITE_PATH", "").strip()
    if raw:
        return Path(raw).resolve()
    return Path.cwd() / "horarios.db"


def _truthy(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes", "on")


def maybe_import_sqlite_from_url() -> None:
    url = os.environ.get("SQLITE_IMPORT_URL", "").strip()
    if not url:
        return

    dest = _resolve_sqlite_dest()
    overwrite = _truthy("SQLITE_IMPORT_OVERWRITE")
    if dest.exists() and dest.stat().st_size > 0 and not overwrite:
        return

    dest.parent.mkdir(parents=True, exist_ok=True)

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "horarios-hot-clic-bootstrap/1"},
    )

    fd, tmp = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    tmp_path = Path(tmp)
    try:
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:  # noqa: S310
                if resp.status != 200:
                    raise RuntimeError(f"HTTP {resp.status}")
                data = resp.read()
                if len(data) < 100:
                    raise RuntimeError("archivo demasiado chico para ser un SQLite válido")
                tmp_path.write_bytes(data)
        except urllib.error.URLError as e:
            raise RuntimeError(f"no se pudo descargar: {e}") from e

        shutil.copy2(tmp_path, dest)
    finally:
        tmp_path.unlink(missing_ok=True)


def main() -> None:
    maybe_import_sqlite_from_url()
    from .db_init import init_db

    init_db()


if __name__ == "__main__":
    main()
