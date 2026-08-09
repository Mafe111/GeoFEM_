"""Punto de entrada de GeoFEM.

Este archivo crea la ventana de escritorio con PyQt6, carga la interfaz HTML
y publica el objeto ``pyBridge`` para comunicar JavaScript con Python mediante
QWebChannel.
"""

import sys
from pathlib import Path

from PyQt6.QtCore import QUrl
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWidgets import QApplication, QMainWindow

from backend.bridge import GeoFemBridge


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_FILE = BASE_DIR / "frontend" / "index.html"


class GeoFemApp(QMainWindow):
    """Ventana principal de la aplicación de escritorio GeoFEM."""

    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("GeoFEM - Plataforma de Estabilidad de Taludes 2D")
        self.resize(1280, 720)

        if not FRONTEND_FILE.exists():
            raise FileNotFoundError(
                f"No se encontró la interfaz principal: {FRONTEND_FILE}"
            )

        # QWebEngineView actúa como el navegador embebido que renderiza la SPA.
        self.visor = QWebEngineView(self)
        self.setCentralWidget(self.visor)

        # QWebChannel comunica los dos mundos: JavaScript <-> Python.
        self.canal = QWebChannel(self.visor.page())
        self.puente = GeoFemBridge()
        self.canal.registerObject("pyBridge", self.puente)
        self.visor.page().setWebChannel(self.canal)

        # Se usa una ruta absoluta para que GeoFEM funcione aunque se ejecute
        # desde un directorio de trabajo diferente.
        self.visor.setUrl(QUrl.fromLocalFile(str(FRONTEND_FILE)))


def main() -> int:
    """Inicia la aplicación y devuelve el código de salida de Qt."""
    app = QApplication(sys.argv)
    ventana = GeoFemApp()
    ventana.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
