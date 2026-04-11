"""
Datos iniciales (profesores, actividades, franjas) según la grilla de referencia del club.
"""

from __future__ import annotations

from datetime import time

from sqlalchemy.orm import Session

from . import models

# dia_semana: 0=Lun … 6=Dom (igual que el frontend)
PROFESORES_NOMBRES = ("Anto", "Manu", "Meli", "More")

# nombre, cupo, es_hot
ACTIVIDADES: tuple[tuple[str, int, bool], ...] = (
    ("Booty Burn", 15, False),
    ("Core Lab", 15, False),
    ("Hot Booty Burn", 15, True),
    ("Hot Pilates", 15, True),
    ("Hot Sculpt", 15, True),
    ("Hot Yoga", 15, True),
    ("Power Sculpt", 15, False),
    ("Stress Release", 15, False),
    ("Yoga", 15, False),
)

# (dia_semana, hora_inicio, hora_fin, profesor_nombre, actividad_nombre)
FRANJAS: tuple[tuple[int, time, time, str, str], ...] = (
    # Mañana L–V (captura 1)
    (0, time(7, 45), time(8, 45), "Anto", "Core Lab"),
    (0, time(8, 45), time(9, 45), "Anto", "Hot Pilates"),
    (0, time(9, 45), time(10, 45), "Anto", "Power Sculpt"),
    (1, time(7, 45), time(8, 45), "Anto", "Hot Pilates"),
    (1, time(8, 45), time(9, 45), "Anto", "Power Sculpt"),
    (1, time(9, 45), time(10, 45), "Meli", "Stress Release"),
    (1, time(10, 45), time(11, 45), "Meli", "Hot Yoga"),
    (1, time(11, 45), time(12, 45), "Meli", "Yoga"),
    (2, time(7, 45), time(8, 45), "Manu", "Hot Pilates"),
    (2, time(8, 45), time(9, 45), "Manu", "Power Sculpt"),
    (2, time(9, 45), time(10, 45), "More", "Hot Sculpt"),
    (2, time(10, 45), time(11, 45), "More", "Core Lab"),
    (2, time(11, 45), time(12, 45), "More", "Hot Booty Burn"),
    (3, time(7, 45), time(8, 45), "Anto", "Booty Burn"),
    (3, time(8, 45), time(9, 45), "Anto", "Hot Pilates"),
    (3, time(9, 45), time(10, 45), "Meli", "Yoga"),
    (3, time(10, 45), time(11, 45), "Meli", "Hot Yoga"),
    (3, time(11, 45), time(12, 45), "Meli", "Stress Release"),
    (4, time(7, 45), time(8, 45), "Manu", "Power Sculpt"),
    (4, time(8, 45), time(9, 45), "Manu", "Hot Pilates"),
    # Tarde (captura 2)
    (0, time(17, 45), time(18, 45), "Manu", "Hot Pilates"),
    (0, time(18, 45), time(19, 45), "Manu", "Power Sculpt"),
    (1, time(15, 45), time(16, 45), "More", "Core Lab"),
    (1, time(16, 45), time(17, 45), "More", "Booty Burn"),
    (1, time(17, 45), time(18, 45), "More", "Hot Sculpt"),
    (1, time(18, 45), time(19, 45), "Manu", "Hot Pilates"),
    (1, time(19, 45), time(20, 45), "Manu", "Power Sculpt"),
    (3, time(18, 45), time(19, 45), "Manu", "Hot Pilates"),
    (3, time(19, 45), time(20, 45), "Manu", "Power Sculpt"),
)


class SeedError(Exception):
    """Error de negocio al aplicar seed (mensaje para HTTP)."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def apply_seed(db: Session, *, replace: bool) -> dict:
    """
    Inserta profesores, actividades y clases por defecto.
    Si replace=False, falla si ya hay al menos un profesor.
    Si replace=True, borra clases, actividades y profesores y vuelve a cargar.
    """
    if not replace:
        if (
            db.query(models.Profesor).first()
            or db.query(models.Actividad).first()
            or db.query(models.ClaseHorario).first()
        ):
            raise SeedError(
                "Ya hay datos o franjas en la grilla. Usá «Reemplazar todo» para borrar "
                "profesores, actividades y clases y cargar el paquete demo.",
                status_code=409,
            )

    if replace:
        db.query(models.ClaseHorario).delete()
        db.query(models.Actividad).delete()
        db.query(models.Profesor).delete()
        db.commit()

    prof_ids: dict[str, int] = {}
    for nombre in PROFESORES_NOMBRES:
        p = models.Profesor(nombre=nombre, email=None)
        db.add(p)
        db.flush()
        prof_ids[nombre] = p.id

    act_ids: dict[str, int] = {}
    for nombre, cupo, es_hot in ACTIVIDADES:
        a = models.Actividad(
            nombre=nombre,
            descripcion=None,
            cupo=cupo,
            es_hot=es_hot,
        )
        db.add(a)
        db.flush()
        act_ids[nombre] = a.id

    n_clases = 0
    for dia, hi, hf, prof_n, act_n in FRANJAS:
        db.add(
            models.ClaseHorario(
                dia_semana=dia,
                hora_inicio=hi,
                hora_fin=hf,
                profesor_id=prof_ids[prof_n],
                actividad_id=act_ids[act_n],
            )
        )
        n_clases += 1

    db.commit()

    return {
        "profesores": len(PROFESORES_NOMBRES),
        "actividades": len(ACTIVIDADES),
        "clases": n_clases,
        "replace": replace,
    }
