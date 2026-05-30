"""Modulo controlador que actúa como el equivalente tecnológico a un Servlet.

Procesa las peticiones asíncronas de los formularios de la interfaz gráfica.
"""

from PyQt6.QtCore import QObject, pyqtSlot

class GeoFemBridge(QObject):

    """Clase puente encargada de interceptar los eventos y formularios de la UI."""

    @pyqtSlot(str, str, result=bool)
    def procesar_formulario_login(self, usuario: str, password: str) -> bool:
        """Equivalente a un metodo POST de un Servlet de Login.
        
        Recibe las credenciales de forma segura y procesa la autenticacion.
        """
        print(f"[Servlet Python] Peticion POST recibida en Login para el usuario: {usuario}")
        
        # Validacion de control de acceso inicial
        if usuario == "admin" and password == "1234":
            print("[Servlet Python] Autenticacion exitosa. Redirigiendo al Dashboard.")
            return True
        
        print("[Servlet Python] Autenticacion fallida. Credenciales incorrectas.")
        return False

    @pyqtSlot(str, str, str, result=bool)
    def procesar_formulario_proyecto(self, nombre: str, codigo: str, ubicacion: str) -> bool:
        """Recibe los datos del formulario del modal de creacion de proyectos."""
        print(f"[Servlet Python] Peticion POST recibida para registrar proyecto: {nombre}")
        
        # Validacion logica de campos obligatorios
        if not nombre or not codigo:
            return False
            
        print(f"[Servlet Python] Proyecto '{nombre}' procesado con exito.")
        return True
