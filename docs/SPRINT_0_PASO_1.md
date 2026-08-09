# GeoFEM — Sprint 0 / Paso 1

## Objetivo

Conseguir el primer flujo completo y comprobable de la aplicación:

```text
frontend/index.html
        ↓
JavaScript crearProyecto()
        ↓
QWebChannel
        ↓
GeoFemBridge.procesar_formulario_proyecto()
        ↓
database_manager.insertar_proyecto()
        ↓
MySQL / tabla Proyecto
        ↓
ID autogenerado
        ↓
JavaScript
        ↓
Workspace
```

## 1. Crear un entorno virtual

En PowerShell, situarse en la carpeta raíz `GEOFEM` y ejecutar:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Si PowerShell bloquea la activación del entorno, usar temporalmente:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 2. Preparar MySQL

Abrir MySQL Workbench y ejecutar el archivo:

```text
database/taludes_fem.sql
```

Después comprobar:

```sql
USE taludes_fem;
SHOW TABLES;
SELECT * FROM Proyecto;
```

## 3. Revisar las credenciales de desarrollo

Abrir:

```text
backend/database_manager.py
```

Y comprobar el bloque `DB_CONFIG`:

```python
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "1234",
    "database": "taludes_fem",
}
```

Cambiar únicamente la contraseña si la instalación local de MySQL utiliza otra.

## 4. Ejecutar GeoFEM correctamente

No abrir `frontend/index.html` directamente en Chrome o Edge.

Desde la raíz del proyecto ejecutar:

```powershell
python app.py
```

`app.py` crea `QWebEngineView`, registra `pyBridge` y carga la SPA.

## 5. Probar el login de desarrollo

Por ahora las credenciales temporales son:

```text
Usuario: ingeniero@geofem.com
Contraseña: 12345678
```

Este login NO es todavía un sistema de autenticación real.

## 6. Crear el primer proyecto persistente

En el Dashboard seleccionar **Crear Nuevo Proyecto** e ingresar por ejemplo:

```text
Nombre: Talud de prueba
Código: GF-TEST-001
Ubicación: Bogotá
```

Al presionar **Crear Proyecto** debe ocurrir lo siguiente:

1. JavaScript valida los campos.
2. JavaScript llama `pyBridge.procesar_formulario_proyecto(...)`.
3. Python valida nuevamente.
4. `database_manager.py` ejecuta un `INSERT` parametrizado.
5. MySQL genera el ID.
6. Python devuelve el ID a JavaScript.
7. El frontend muestra el Workspace solamente si el ID es mayor que cero.

## 7. Confirmar el registro en MySQL

En Workbench ejecutar:

```sql
SELECT
    id,
    nombre,
    codigo,
    ubicacion,
    fecha_creacion
FROM Proyecto
ORDER BY id DESC;
```

El registro creado desde GeoFEM debe aparecer allí.

## 8. Si aparece un error

### `No module named PyQt6`

El entorno virtual no está activo o no se instalaron los requisitos:

```powershell
pip install -r requirements.txt
```

### `No module named mysql`

Ejecutar:

```powershell
pip install mysql-connector-python
```

### `Access denied for user 'root'`

La contraseña de `DB_CONFIG` no coincide con la contraseña local de MySQL.

### `Unknown database 'taludes_fem'`

Todavía no se ha ejecutado `database/taludes_fem.sql`.

### GeoFEM dice que Python no está conectado

Probablemente se abrió `index.html` directamente en el navegador. Cerrar esa ventana y ejecutar:

```powershell
python app.py
```

## Qué NO estamos haciendo todavía

En este paso no se modifica el solver FEM ni se ejecuta SSR. El objetivo es validar una capa a la vez. El archivo `fem_engine.py` continúa como prototipo experimental y no debe utilizarse todavía para resultados de ingeniería.
