"""Inicialización idempotente de la base (tablas + migraciones SQLite)."""

from sqlalchemy import text

from .database import Base, engine


def _sqlite_migrate_actividades_es_hot() -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(actividades)")).fetchall()
        col_names = {row[1] for row in rows}
        if "es_hot" not in col_names:
            conn.execute(
                text("ALTER TABLE actividades ADD COLUMN es_hot BOOLEAN NOT NULL DEFAULT 0")
            )


def init_db() -> None:
    from . import models  # noqa: F401 — registra tablas en metadata

    Base.metadata.create_all(bind=engine)
    _sqlite_migrate_actividades_es_hot()
