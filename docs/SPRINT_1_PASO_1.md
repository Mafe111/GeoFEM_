# GeoFEM — Sprint 1 / Paso 1

## Núcleo del CAD: `projectState` + capas del viewport SVG

Este paso inicia formalmente el núcleo CAD de GeoFEM. El objetivo **no es dibujar todavía**, sino establecer una arquitectura segura para que geometría, malla, materiales, restricciones y resultados no queden almacenados en el SVG.

---

## 1. Objetivo del paso

Al finalizar este paso, GeoFEM debe:

1. Mantener un objeto central `projectState` para el proyecto abierto.
2. Crear un estado completamente nuevo cada vez que se abre o crea un proyecto.
3. Separar los datos del modelo de su representación SVG.
4. Dividir el SVG en capas vacías para geometría, malla, restricciones, resultados y selección.
5. Mostrar en el panel derecho un resumen real de `projectState`.
6. Eliminar el polígono de talud de demostración que antes estaba dibujado directamente en HTML.

> Importante: en este paso **no se guarda todavía geometría en MySQL**. La persistencia del CAD llegará más adelante.

---

## 2. Arquitectura que estamos construyendo

Antes:

```text
SVG
 ├─ polygon demo
 ├─ text
 └─ figuras escritas directamente en HTML
```

Ahora:

```text
                 projectState
                      │
         ┌────────────┼────────────┐
         │            │            │
     geometry       mesh       materials
         │            │            │
         └────────────┼────────────┘
                      │
                   render()
                      │
                      ▼
                     SVG
                      │
         ┌────────────┼─────────────┐
         │            │             │
     geometryLayer meshLayer boundaryLayer ...
```

**Regla de arquitectura:** el SVG representa los datos; no es la fuente de verdad.

---

## 3. Archivo nuevo: `frontend/js/project-state.js`

Este archivo crea la estructura central del proyecto.

La estructura inicial es:

```javascript
projectState = {
    schemaVersion: "1.0.0",
    project: {...},
    units: {...},
    geometry: {
        points: [],
        lines: [],
        polylines: [],
        regions: []
    },
    materials: [],
    mesh: {
        elementType: "T3",
        nodes: [],
        elements: [],
        visible: true
    },
    boundaryConditions: [],
    loads: [],
    analysis: {...},
    results: {...},
    viewport: {...},
    ui: {...},
    dirty: false
};
```

### ¿Por qué `schemaVersion`?

Porque el modelo cambiará con el tiempo. Por ejemplo, en el futuro podemos pasar de:

```text
State 1.0.0
```

a:

```text
State 1.1.0
```

si añadimos agua, fases o nuevos tipos de cargas. Esto permitirá migrar proyectos antiguos de forma controlada.

### ¿Qué significa `dirty`?

`dirty = false` significa:

> El modelo no tiene cambios sin guardar.

Cuando en pasos posteriores el usuario mueva un punto o cree una región, marcaremos:

```javascript
projectState.dirty = true;
```

para saber que el proyecto necesita guardarse.

---

## 4. Capas del SVG

El viewport ahora contiene:

```html
<g id="viewportContent">
    <g id="geometryLayer"></g>
    <g id="meshLayer"></g>
    <g id="boundaryLayer"></g>
    <g id="resultLayer"></g>
    <g id="selectionLayer"></g>
</g>
```

Cada capa tendrá una sola responsabilidad:

| Capa | Contenido futuro |
|---|---|
| `geometryLayer` | puntos, líneas, polilíneas y regiones |
| `meshLayer` | nodos y elementos T3/T6 |
| `boundaryLayer` | restricciones y cargas |
| `resultLayer` | contornos, deformaciones y resultados FEM |
| `selectionLayer` | resaltado y handles de edición |

El orden es importante: lo que aparece más abajo en el SVG se dibuja encima de lo anterior.

---

## 5. Crear la rama del Sprint 1

Partiendo de `main` limpia:

```powershell
git status
```

Debe decir:

```text
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

Crea la rama:

```powershell
git switch -c feature/sprint1-cad-core
```

Comprueba:

```powershell
git branch
```

Debe aparecer:

```text
* feature/sprint1-cad-core
  main
```

---

## 6. Aplicar los archivos del paquete PATCH

El ZIP de este paso contiene únicamente los archivos nuevos/modificados. **No contiene `.git`**, para no alterar el historial que ya tienes correctamente configurado.

Copia sobre tu carpeta actual `GEOFEM`:

```text
frontend/index.html
frontend/js/project-state.js
docs/SPRINT_1_PASO_1.md
```

Windows puede preguntar si deseas reemplazar `frontend/index.html`. Responde **Sí**, porque esa es la modificación de este Sprint.

No se reemplazan:

```text
.git/
.venv/
backend/
database/
```

---

## 7. No hay nuevas dependencias

No necesitas ejecutar `pip install` nuevamente. Este paso utiliza únicamente JavaScript y SVG.

Tu entorno `.venv` actual sigue siendo válido.

---

## 8. Ejecutar GeoFEM

Con el entorno activo:

```powershell
python app.py
```

Inicia sesión con las credenciales de desarrollo actuales.

Abre un proyecto existente.

---

## 9. Resultado visual esperado

### Antes

El workspace mostraba un polígono de talud de demostración escrito directamente en HTML.

### Ahora

El viewport debe mostrar solamente el grid y el mensaje:

```text
Proyecto sin geometría
El modelo CAD se generará desde projectState
```

Esto **no es una pérdida de funcionalidad**. Estamos retirando una figura falsa para empezar a representar exclusivamente datos reales.

En el panel derecho debes ver:

```text
Proyecto activo
ID: <id real de MySQL>
Nombre: <nombre real>
Código: <código real>
State 1.0.0
```

Y:

```text
Modelo interno
Puntos: 0
Líneas: 0
Regiones: 0
Materiales: 0
```

La barra inferior debe seguir mostrando:

```text
Factor de Seguridad: --
Nodos: 0
Elementos: 0
Estado: Proyecto #... · ...
```

---

## 10. Prueba de aislamiento entre proyectos

1. Abre el proyecto A.
2. Comprueba su ID, nombre y código en el panel derecho.
3. Pulsa `← Mis proyectos`.
4. Abre el proyecto B.
5. Comprueba que el panel derecho cambia al proyecto B.
6. Los contadores deben seguir en cero para ambos.

Cada llamada a `activarProyecto()` crea:

```javascript
projectState = GeoFEMState.crearProjectState(proyectoActivo);
```

Por tanto, el estado de un proyecto no se reutiliza accidentalmente al abrir otro.

---

## 11. Qué ocurre dentro del código

### A. Dashboard selecciona un proyecto

```text
clic tarjeta
    ↓
abrirProyectoExistente(id)
```

### B. Se identifica el objeto

```text
proyectosDashboard
    ↓
find(id)
```

### C. Se activa

```text
activarProyecto(proyecto)
```

### D. Se crea el estado

```text
GeoFEMState.crearProjectState(proyecto)
    ↓
projectState
```

### E. Se renderiza

```text
renderizarProjectState()
    ↓
limpiar capas SVG
actualizar panel derecho
actualizar contadores
actualizar estado vacío
```

Esta secuencia será la misma cuando más adelante carguemos geometría real desde disco o base de datos.

---

## 12. Revisar Git después de la prueba

No hagas commit todavía.

Ejecuta:

```powershell
git status
```

Esperamos algo parecido a:

```text
On branch feature/sprint1-cad-core

Changes not staged for commit:
    modified: frontend/index.html

Untracked files:
    docs/SPRINT_1_PASO_1.md
    frontend/js/project-state.js
```

Luego puedes revisar el resumen:

```powershell
git diff --stat
```

Y el archivo principal:

```powershell
git diff frontend/index.html
```

No hagas `git add` ni `git commit` hasta confirmar que la prueba funcional terminó correctamente.

---

## 13. Qué NO estamos haciendo todavía

No se implementa aún:

- zoom;
- pan;
- conversión coordenadas modelo/pantalla;
- snap;
- selección;
- dibujo de puntos;
- dibujo de líneas;
- polígonos;
- persistencia de geometría;
- DXF;
- malla;
- FEM.

Esto es intencional. Primero estamos creando una base de estado confiable.

---

## 14. Próximo paso

**Sprint 1 / Paso 2:** sistema de coordenadas del CAD.

Construiremos explícitamente:

```text
coordenadas de ingeniería (m)
          ↕
transformación
          ↕
coordenadas SVG/pantalla
```

Eso permitirá que el usuario pueda trabajar en metros aunque la pantalla opere con píxeles/unidades SVG.
