"""Puente entre la interfaz JavaScript y el backend Python de GeoFEM.

El bridge debe ser delgado: recibe datos desde la interfaz, valida lo básico y
delega el trabajo a los módulos Python correspondientes. No contiene SQL ni
cálculos FEM directamente.
"""

import json
from datetime import date, datetime

from PyQt6.QtCore import QObject, pyqtSlot

from backend.database_manager import consultar_proyectos, insertar_proyecto


class GeoFemBridge(QObject):
    """Expone métodos Python que JavaScript puede invocar mediante QWebChannel."""

    @pyqtSlot(str, str, result=bool)
    def procesar_formulario_login(self, usuario: str, password: str) -> bool:
        """Valida temporalmente el acceso al prototipo.

        Este login es únicamente de desarrollo. Más adelante será reemplazado
        por un sistema real de usuarios o por una apertura directa de proyectos.
        """
        usuario = usuario.strip()

        usuario_demo = "ingeniero@geofem.com"
        password_demo = "12345678"

        autorizado = usuario == usuario_demo and password == password_demo

        if autorizado:
            print(f"[Bridge] Login autorizado para: {usuario}")
        else:
            print(f"[Bridge] Login rechazado para: {usuario}")

        return autorizado


    @staticmethod
    def _fecha_a_texto(valor) -> str | None:
        """Convierte fechas MySQL a texto ISO para enviarlas a JavaScript."""
        if valor is None:
            return None
        if isinstance(valor, (datetime, date)):
            return valor.isoformat()
        return str(valor)

    @pyqtSlot(result=str)
    def obtener_proyectos_dashboard(self) -> str:
        """Consulta MySQL y devuelve al Dashboard una respuesta JSON estable.

        QWebChannel puede transportar tipos simples con mucha fiabilidad. En este
        Sprint usamos JSON para que el contrato entre Python y JavaScript sea
        explícito y fácil de inspeccionar mientras aprendemos la arquitectura.
        """
        proyectos = consultar_proyectos()

        if proyectos is None:
            respuesta = {
                "ok": False,
                "mensaje": (
                    "No fue posible consultar los proyectos. "
                    "Revisa la conexión con MySQL."
                ),
                "proyectos": [],
            }
            return json.dumps(respuesta, ensure_ascii=False)

        proyectos_serializados = []

        for proyecto in proyectos:
            proyectos_serializados.append(
                {
                    "id": int(proyecto["id"]),
                    "nombre": proyecto.get("nombre") or "",
                    "codigo": proyecto.get("codigo") or "",
                    "ubicacion": proyecto.get("ubicacion") or "",
                    "fecha_creacion": self._fecha_a_texto(
                        proyecto.get("fecha_creacion")
                    ),
                    "fecha_ultima_mod": self._fecha_a_texto(
                        proyecto.get("fecha_ultima_mod")
                    ),
                }
            )

        respuesta = {
            "ok": True,
            "mensaje": "Consulta completada.",
            "proyectos": proyectos_serializados,
        }

        print(
            f"[Bridge] Dashboard cargado con "
            f"{len(proyectos_serializados)} proyecto(s)."
        )

        return json.dumps(respuesta, ensure_ascii=False)

    @pyqtSlot(str, str, str, result=int)
    def procesar_formulario_proyecto(
        self,
        nombre: str,
        codigo: str,
        ubicacion: str,
    ) -> int:
        """Crea un proyecto real en MySQL y devuelve su ID.

        Retorna 0 cuando la validación falla o cuando MySQL no puede guardar el
        registro. Un ID mayor que cero significa que la persistencia fue exitosa.
        """
        nombre = nombre.strip()
        codigo = codigo.strip()
        ubicacion = ubicacion.strip()

        if not nombre or not codigo or not ubicacion:
            print("[Bridge] Proyecto rechazado: faltan campos obligatorios.")
            return 0

        proyecto_id = insertar_proyecto(nombre, codigo, ubicacion)

        if proyecto_id > 0:
            print(
                f"[Bridge] Proyecto guardado correctamente. "
                f"ID={proyecto_id}, nombre='{nombre}'"
            )
        else:
            print("[Bridge] No fue posible guardar el proyecto en MySQL.")

        return proyecto_id
