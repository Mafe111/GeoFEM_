# GeoFEM — Sprint 0 / Paso 2

## Objetivo

En este paso GeoFEM deja de tener un Dashboard puramente visual y empieza a
leer los proyectos que realmente existen en MySQL.

El flujo que queremos comprobar es:

```text
Login
  ↓
Dashboard
  ↓
JavaScript solicita proyectos
  ↓
QWebChannel
  ↓
bridge.py
  ↓
database_manager.py
  ↓
MySQL
  ↓
JSON
  ↓
JavaScript
  ↓
Tarjetas del Dashboard
```

Además se ordena el estado del repositorio Git para que los borradores locales
y archivos históricos no se mezclen accidentalmente con el código activo.

---

## 1. Qué cambió técnicamente

### `backend/database_manager.py`

`consultar_proyectos()` ahora trae:

- id
- nombre
- código
- ubicación
- fecha de creación
- fecha de última modificación

También distingue dos situaciones diferentes:

- `[]`: la consulta funcionó, pero no hay proyectos.
- `None`: hubo un error de base de datos.

Esta diferencia permite mostrar un mensaje correcto al usuario.

### `backend/bridge.py`

Se añadió:

```python
obtener_proyectos_dashboard()
```

Este método consulta la base de datos y devuelve una cadena JSON a JavaScript.
Las fechas de MySQL se convierten primero a texto ISO para que JSON pueda
transportarlas sin ambigüedad.

### `frontend/index.html`

Se añadieron:

- tarjetas dinámicas de proyectos;
- mensaje de carga/error/vacío;
- apertura de un proyecto existente;
- variable `proyectoActivo`;
- botón `← Mis proyectos` dentro del Workspace;
- recarga del Dashboard al volver desde el Workspace.

---

## 2. Primera prueba

Abre una terminal de VS Code en la raíz del proyecto.

Activa tu entorno virtual:

```powershell
.\.venv\Scripts\Activate.ps1
```

Asegúrate de que MySQL esté iniciado.

Ejecuta GeoFEM:

```powershell
python app.py
```

Inicia sesión con las credenciales temporales del prototipo.

### Resultado esperado

Al entrar al Dashboard debe aparecer automáticamente la tarjeta del proyecto
que creaste durante el Paso 1.

Si existen varios proyectos en MySQL, deben aparecer todos, ordenados por la
última modificación.

En la consola de VS Code deberías ver algo parecido a:

```text
[Bridge] Dashboard cargado con 1 proyecto(s).
```

Y en el Dashboard:

```text
1 proyecto(s) cargado(s) desde MySQL.
```

---

## 3. Probar la apertura de un proyecto existente

Haz clic sobre una tarjeta de proyecto.

GeoFEM debe:

1. abrir el Workspace;
2. colocar el nombre del proyecto en la parte superior;
3. mostrar en la barra de estado algo parecido a:

```text
Proyecto #1 · GF-TEST-001
```

Internamente JavaScript crea:

```javascript
proyectoActivo = {
    id: 1,
    nombre: "Talud de prueba",
    codigo: "GF-TEST-001",
    ubicacion: "Bogotá",
    ...
};
```

Todavía no contiene la geometría FEM. En los siguientes Sprints evolucionará a
`projectState`.

---

## 4. Probar el botón «Mis proyectos»

Dentro del Workspace pulsa:

```text
← Mis proyectos
```

GeoFEM debe volver al Dashboard y volver a consultar MySQL.

Esta recarga es intencional: la base de datos vuelve a ser la fuente de verdad
para la lista de proyectos.

---

## 5. Prueba adicional recomendada

Crea un segundo proyecto desde el Dashboard.

Ejemplo:

```text
Nombre: Talud demostración 02
Código: GF-TEST-002
Ubicación: Medellín
```

Al crearlo GeoFEM debe abrir el Workspace.

Pulsa después `← Mis proyectos`.

Ahora deben aparecer dos tarjetas.

Puedes comprobarlo también en MySQL Workbench:

```sql
USE taludes_fem;

SELECT
    id,
    nombre,
    codigo,
    ubicacion,
    fecha_creacion,
    fecha_ultima_mod
FROM Proyecto
ORDER BY fecha_ultima_mod DESC, id DESC;
```

La información del Dashboard y la consulta SQL deben coincidir.

---

## 6. Cómo probar un fallo de conexión

Esta prueba es opcional pero muy educativa.

1. Cierra GeoFEM.
2. Detén temporalmente MySQL.
3. Ejecuta nuevamente `python app.py`.
4. Inicia sesión.

El Dashboard no debe fingir que simplemente hay cero proyectos. Debe indicar
que no fue posible consultar MySQL.

Después vuelve a iniciar MySQL antes de continuar.

---

# Parte Git — qué estamos ordenando

Git compara tu carpeta actual con el último commit.

Los estados que más usarás son:

```text
M   Modified   → archivo conocido por Git que cambió
D   Deleted    → archivo conocido por Git que ya no está
??  Untracked  → archivo nuevo que Git todavía no sigue
```

En el ZIP original existían varias copias históricas del frontend y, al mismo
tiempo, faltaban archivos antiguos que Git todavía recordaba. Para no mezclar
eso con el desarrollo activo:

- los archivos históricos que Git ya conocía se conservaron;
- el frontend activo quedó normalizado como `frontend/index.html`;
- los borradores locales se colocaron en `local_backups/`;
- `local_backups/` está incluido en `.gitignore`.

Por tanto, Git no intentará versionar esos borradores.

## Comando de inspección

Ejecuta:

```powershell
git status
```

No ejecutes todavía `git add .` sin mirar el resultado.

La regla que vamos a aprender es:

> primero inspeccionar, después seleccionar, finalmente confirmar.

Puedes ver los cambios de un archivo con:

```powershell
git diff backend/bridge.py
```

Y los del Dashboard con:

```powershell
git diff frontend/index.html
```

En el siguiente cierre del Sprint prepararemos juntos un commit controlado.

---

# Criterio de aceptación del Paso 2

El Paso 2 queda aprobado cuando se cumplan las siguientes condiciones:

- GeoFEM inicia desde `app.py`.
- El login funciona.
- El Dashboard consulta MySQL automáticamente.
- El proyecto creado en el Paso 1 aparece como tarjeta.
- Crear otro proyecto hace que aparezca después de volver al Dashboard.
- Una tarjeta existente abre el Workspace correcto.
- El botón `← Mis proyectos` vuelve al Dashboard.
- `git status` puede inspeccionarse sin que los borradores locales aparezcan
  como nuevos archivos del frontend activo.

Cuando todo esto funcione, podremos cerrar Sprint 0 con la configuración de Git
y después comenzar el Sprint 1: núcleo CAD 2D.
