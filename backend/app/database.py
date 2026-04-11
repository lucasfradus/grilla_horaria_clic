import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base


def _sqlite_database_url() -> str:
    """
    Local: sqlite:///./horarios.db (cwd del proceso).

    Railway u otro host: definí SQLITE_PATH apuntando a un archivo en un volumen
    persistente, ej. /data/horarios.db
    """
    raw = os.environ.get("SQLITE_PATH", "").strip()
    if not raw:
        return "sqlite:///./horarios.db"
    path = Path(raw)
    path.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{path.resolve().as_posix()}"


SQLALCHEMY_DATABASE_URL = _sqlite_database_url()

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _sqlite_foreign_keys(dbapi_connection, _):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
