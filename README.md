# GeoFEM

Prototipo de aplicación de escritorio para modelación geotécnica 2D mediante
PyQt6 + HTML/CSS/JavaScript + QWebChannel, con persistencia MySQL y un motor
numérico Python en desarrollo.

## Arranque de desarrollo

1. Crear y activar un entorno virtual de Python.
2. Instalar `requirements.txt`.
3. Crear la base de datos ejecutando `database/taludes_fem.sql` en MySQL.
4. Revisar las credenciales de desarrollo en `backend/database_manager.py`.
5. Ejecutar `python app.py` desde la raíz del proyecto.

> Importante: el motor SSR actual es experimental y no debe utilizarse para
> resultados de ingeniería hasta completar su formulación y validación.

## Estado actual de desarrollo

### Sprint 0

- [x] Paso 1: creación real de proyectos mediante QWebChannel + MySQL.
- [x] Paso 2: lectura de proyectos y Dashboard dinámico.
- [ ] Cierre: commit limpio y configuración local de desarrollo.

La documentación paso a paso está disponible en `docs/`.
