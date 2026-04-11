from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.orm import relationship

from .database import Base


class AppConfig(Base):
    """Fila única (id=1): preferencias que afectan la vista pública."""

    __tablename__ = "app_config"

    id = Column(Integer, primary_key=True)
    ocultar_profesor_vista_publica = Column(Boolean, nullable=False, default=False)


class Profesor(Base):
    __tablename__ = "profesores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    email = Column(String(200), nullable=True)

    clases = relationship("ClaseHorario", back_populates="profesor")


class Actividad(Base):
    __tablename__ = "actividades"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(String(500), nullable=True)
    cupo = Column(Integer, nullable=False, default=10)
    es_hot = Column(Boolean, nullable=False, default=False)

    clases = relationship("ClaseHorario", back_populates="actividad")


class ClaseHorario(Base):
    """Franja en la grilla; profesor y actividad opcionales hasta asignar por DnD."""

    __tablename__ = "clases_horario"
    __table_args__ = (
        UniqueConstraint(
            "dia_semana", "hora_inicio", "hora_fin", name="uq_clase_dia_horario"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    dia_semana = Column(Integer, nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    profesor_id = Column(
        Integer, ForeignKey("profesores.id", ondelete="SET NULL"), nullable=True
    )
    actividad_id = Column(
        Integer, ForeignKey("actividades.id", ondelete="SET NULL"), nullable=True
    )

    profesor = relationship("Profesor", back_populates="clases")
    actividad = relationship("Actividad", back_populates="clases")
