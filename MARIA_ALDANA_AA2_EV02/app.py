"""Lanzador del aplicativo GeoFEM que integra la UI Web con el entorno de escritorio."""

import sys
import os
from PyQt6.QtWidgets import QApplication, QMainWindow
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel  # <- ESTA ES LA RUTA MODERNA CORRECTA
from PyQt6.QtCore import QUrl
from backend.bridge import GeoFemBridge


class GeoFemApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GeoFEM - Plataforma de Estabilidad de Taludes 2D")
        self.resize(1280, 720)

        # Configuración del componente Chromium integrado
        self.visor = QWebEngineView()
        self.setCentralWidget(self.visor)

        # Configuración del canal del puente interactivo
        self.canal = QWebChannel()
        self.puente = GeoFemBridge()
        self.canal.registerObject("pyBridge", self.puente)
        self.visor.page().setWebChannel(self.canal)

        # Enrutar correctamente hacia la subcarpeta frontend
        ruta_html = os.path.abspath("frontend/index.html")
        self.visor.setUrl(QUrl.fromLocalFile(ruta_html))

if __name__ == "__main__":
    app = QApplication(sys.argv)
    ventana = GeoFemApp()
    ventana.show()
    sys.exit(app.exec())
