from datetime import time

from pydantic import BaseModel, Field, field_validator


class ProfesorBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    email: str | None = None


class ProfesorCreate(ProfesorBase):
    pass


class ProfesorRead(ProfesorBase):
    id: int

    model_config = {"from_attributes": True}


class ActividadBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    descripcion: str | None = None
    cupo: int = Field(..., ge=1, le=500)


class ActividadCreate(ActividadBase):
    pass


class ActividadRead(ActividadBase):
    id: int

    model_config = {"from_attributes": True}


class FranjaHorariaInput(BaseModel):
    hora_inicio: time
    hora_fin: time

    @field_validator("hora_fin")
    @classmethod
    def fin_despues_inicio(cls, v: time, info):
        ini = info.data.get("hora_inicio")
        if ini is not None and v <= ini:
            raise ValueError("hora_fin debe ser posterior a hora_inicio")
        return v


class ClaseHorarioCreateVacia(BaseModel):
    """Crear una franja sin profesor ni actividad."""

    dia_semana: int = Field(..., ge=0, le=6)
    hora_inicio: time
    hora_fin: time

    @field_validator("hora_fin")
    @classmethod
    def fin_despues_inicio(cls, v: time, info):
        ini = info.data.get("hora_inicio")
        if ini is not None and v <= ini:
            raise ValueError("hora_fin debe ser posterior a hora_inicio")
        return v


class ClaseHorarioBulkRecurrencia(BaseModel):
    dias_semana: list[int] = Field(..., min_length=1)
    franjas: list[FranjaHorariaInput] = Field(..., min_length=1)

    @field_validator("dias_semana")
    @classmethod
    def dias_validos(cls, v: list[int]):
        for d in v:
            if d < 0 or d > 6:
                raise ValueError("dias_semana deben estar entre 0 y 6")
        return v


class ClaseHorarioPatch(BaseModel):
    profesor_id: int | None = None
    actividad_id: int | None = None


class ClaseHorarioRead(BaseModel):
    id: int
    dia_semana: int
    hora_inicio: time
    hora_fin: time
    profesor_id: int | None
    actividad_id: int | None
    profesor: ProfesorRead | None
    actividad: ActividadRead | None

    model_config = {"from_attributes": True}


class AppConfigRead(BaseModel):
    ocultar_profesor_vista_publica: bool


class AppConfigPatch(BaseModel):
    ocultar_profesor_vista_publica: bool | None = None
