import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from . import models, schemas
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Horarios Centro", version="0.2.0")

DEFAULT_CORS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
cors_from_env = os.getenv("CORS_ORIGINS")
allow_origins = (
    [o.strip() for o in cors_from_env.split(",") if o.strip()]
    if cors_from_env
    else DEFAULT_CORS
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


# --- Profesores ---


@app.post("/profesores", response_model=schemas.ProfesorRead)
def crear_profesor(p: schemas.ProfesorCreate, db: Session = Depends(get_db)):
    row = models.Profesor(nombre=p.nombre.strip(), email=p.email)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/profesores", response_model=list[schemas.ProfesorRead])
def listar_profesores(db: Session = Depends(get_db)):
    return db.query(models.Profesor).order_by(models.Profesor.nombre).all()


@app.get("/profesores/{profesor_id}", response_model=schemas.ProfesorRead)
def obtener_profesor(profesor_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Profesor, profesor_id)
    if not row:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    return row


@app.patch("/profesores/{profesor_id}", response_model=schemas.ProfesorRead)
def actualizar_profesor(
    profesor_id: int, p: schemas.ProfesorCreate, db: Session = Depends(get_db)
):
    row = db.get(models.Profesor, profesor_id)
    if not row:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    row.nombre = p.nombre.strip()
    row.email = p.email
    db.commit()
    db.refresh(row)
    return row


@app.delete("/profesores/{profesor_id}", status_code=204)
def borrar_profesor(profesor_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Profesor, profesor_id)
    if not row:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    db.delete(row)
    db.commit()
    return None


# --- Actividades ---


@app.post("/actividades", response_model=schemas.ActividadRead)
def crear_actividad(a: schemas.ActividadCreate, db: Session = Depends(get_db)):
    row = models.Actividad(
        nombre=a.nombre.strip(),
        descripcion=a.descripcion,
        cupo=a.cupo,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.get("/actividades", response_model=list[schemas.ActividadRead])
def listar_actividades(db: Session = Depends(get_db)):
    return db.query(models.Actividad).order_by(models.Actividad.nombre).all()


@app.get("/actividades/{actividad_id}", response_model=schemas.ActividadRead)
def obtener_actividad(actividad_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Actividad, actividad_id)
    if not row:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return row


@app.patch("/actividades/{actividad_id}", response_model=schemas.ActividadRead)
def actualizar_actividad(
    actividad_id: int, a: schemas.ActividadCreate, db: Session = Depends(get_db)
):
    row = db.get(models.Actividad, actividad_id)
    if not row:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    row.nombre = a.nombre.strip()
    row.descripcion = a.descripcion
    row.cupo = a.cupo
    db.commit()
    db.refresh(row)
    return row


@app.delete("/actividades/{actividad_id}", status_code=204)
def borrar_actividad(actividad_id: int, db: Session = Depends(get_db)):
    row = db.get(models.Actividad, actividad_id)
    if not row:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    db.delete(row)
    db.commit()
    return None


# --- Franjas / clases en grilla ---


def _cargar_clase(db: Session, clase_id: int) -> models.ClaseHorario | None:
    return (
        db.query(models.ClaseHorario)
        .options(joinedload(models.ClaseHorario.profesor))
        .options(joinedload(models.ClaseHorario.actividad))
        .filter(models.ClaseHorario.id == clase_id)
        .first()
    )


@app.post("/clases", response_model=schemas.ClaseHorarioRead)
def crear_clase_vacia(c: schemas.ClaseHorarioCreateVacia, db: Session = Depends(get_db)):
    row = models.ClaseHorario(
        dia_semana=c.dia_semana,
        hora_inicio=c.hora_inicio,
        hora_fin=c.hora_fin,
        profesor_id=None,
        actividad_id=None,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe una franja con ese día y horario",
        )
    db.refresh(row)
    loaded = _cargar_clase(db, row.id)
    return loaded


@app.post("/clases/bulk-recurrencia", response_model=list[schemas.ClaseHorarioRead])
def crear_franjas_recurrencia(
    body: schemas.ClaseHorarioBulkRecurrencia, db: Session = Depends(get_db)
):
    creadas: list[models.ClaseHorario] = []
    for dia in body.dias_semana:
        for fr in body.franjas:
            existe = (
                db.query(models.ClaseHorario)
                .filter(
                    models.ClaseHorario.dia_semana == dia,
                    models.ClaseHorario.hora_inicio == fr.hora_inicio,
                    models.ClaseHorario.hora_fin == fr.hora_fin,
                )
                .first()
            )
            if existe:
                continue
            row = models.ClaseHorario(
                dia_semana=dia,
                hora_inicio=fr.hora_inicio,
                hora_fin=fr.hora_fin,
                profesor_id=None,
                actividad_id=None,
            )
            db.add(row)
            creadas.append(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto al crear franjas")
    for row in creadas:
        db.refresh(row)
    return [
        _cargar_clase(db, row.id)
        for row in sorted(creadas, key=lambda r: (r.dia_semana, r.hora_inicio))
    ]


@app.get("/clases", response_model=list[schemas.ClaseHorarioRead])
def listar_clases(db: Session = Depends(get_db)):
    return (
        db.query(models.ClaseHorario)
        .options(joinedload(models.ClaseHorario.profesor))
        .options(joinedload(models.ClaseHorario.actividad))
        .order_by(
            models.ClaseHorario.dia_semana,
            models.ClaseHorario.hora_inicio,
        )
        .all()
    )


@app.get("/clases/{clase_id}", response_model=schemas.ClaseHorarioRead)
def obtener_clase(clase_id: int, db: Session = Depends(get_db)):
    row = _cargar_clase(db, clase_id)
    if not row:
        raise HTTPException(status_code=404, detail="Franja no encontrada")
    return row


@app.patch("/clases/{clase_id}", response_model=schemas.ClaseHorarioRead)
def parchear_clase(
    clase_id: int, body: schemas.ClaseHorarioPatch, db: Session = Depends(get_db)
):
    row = db.get(models.ClaseHorario, clase_id)
    if not row:
        raise HTTPException(status_code=404, detail="Franja no encontrada")
    data = body.model_dump(exclude_unset=True)
    if "profesor_id" in data:
        pid = data["profesor_id"]
        if pid is not None and not db.get(models.Profesor, pid):
            raise HTTPException(status_code=400, detail="profesor_id inválido")
        row.profesor_id = pid
    if "actividad_id" in data:
        aid = data["actividad_id"]
        if aid is not None and not db.get(models.Actividad, aid):
            raise HTTPException(status_code=400, detail="actividad_id inválido")
        row.actividad_id = aid
    db.commit()
    loaded = _cargar_clase(db, clase_id)
    return loaded


@app.delete("/clases/{clase_id}", status_code=204)
def borrar_clase(clase_id: int, db: Session = Depends(get_db)):
    row = db.get(models.ClaseHorario, clase_id)
    if not row:
        raise HTTPException(status_code=404, detail="Franja no encontrada")
    db.delete(row)
    db.commit()
    return None


STATIC_DIR = Path(__file__).resolve().parent / "static"
if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    def spa_root():
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str):
        # Mantiene rutas del frontend (/, /horarios, /admin-path, etc.) en un solo servicio.
        if full_path.startswith(("docs", "redoc", "openapi.json")):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
