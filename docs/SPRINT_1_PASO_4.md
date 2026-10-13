# GeoFEM — Sprint 1 / Paso 4

## Objetivo

Introducir las primeras entidades CAD reales dentro de `projectState` y validar el flujo completo:

```text
clic del usuario
    ↓
coordenada del mouse
    ↓
screenToModel()
    ↓
crear punto en projectState
    ↓
renderizar geometría
    ↓
seleccionar punto
    ↓
mostrar propiedades X/Y
```

Este paso NO persiste todavía la geometría en MySQL. Los puntos viven solamente en memoria durante la sesión actual. GeoFEM avisa antes de volver al Dashboard si existen cambios locales no guardados.

---

## Archivos

- `frontend/index.html`
- `frontend/js/cad-geometry.js` (nuevo)
- `docs/SPRINT_1_PASO_4.md` (nuevo)

No se modifica el solver FEM ni la base de datos.

---

## Arquitectura

### Fuente de verdad

Los puntos se almacenan en:

```javascript
projectState.geometry.points
```

Ejemplo:

```javascript
[
  { id: "P1", x: 10.25, y: 4.80 },
  { id: "P2", x: 18.10, y: 7.35 }
]
```

El SVG se reconstruye a partir de esos datos. El círculo SVG NO es el punto científico; solo lo representa.

---

## Herramientas nuevas

### Seleccionar

Permite hacer clic sobre un punto existente. La selección se guarda en:

```javascript
projectState.ui.selection
```

El punto seleccionado recibe un anillo naranja en `selectionLayer` y sus coordenadas aparecen en el panel derecho.

### Crear Punto

Cada clic dentro del canvas se convierte a coordenadas del modelo y crea un nuevo punto:

```text
P1, P2, P3, ...
```

Las coordenadas se guardan en metros.

---

## Renderizado

`cad-geometry.js` separa cuatro responsabilidades:

1. crear puntos;
2. gestionar selección;
3. dibujar `geometryLayer`;
4. dibujar `selectionLayer`.

Al hacer zoom o pan los puntos se vuelven a dibujar desde sus coordenadas reales utilizando `modelToScreen()`. Por eso mover la cámara no cambia `x` ni `y` del punto.

---

## Estado dirty

Al crear o limpiar puntos:

```javascript
projectState.dirty = true
```

El panel muestra:

```text
Cambios locales sin guardar
```

En este paso los puntos aún no se escriben en MySQL. Si se intenta volver al Dashboard, GeoFEM muestra una advertencia para evitar pérdida accidental.

---

## Pruebas esperadas

1. Abrir un proyecto.
2. Elegir `• Crear Punto`.
3. Hacer clic en tres zonas distintas del canvas.
4. Confirmar que `Puntos` pasa de `0` a `3`.
5. Confirmar que el último punto aparece seleccionado.
6. Elegir `↖ Seleccionar`.
7. Hacer clic sobre P1, P2 y P3 y verificar sus coordenadas en el panel derecho.
8. Hacer zoom y pan; los puntos deben moverse visualmente con la cámara, pero sus coordenadas X/Y no deben cambiar.
9. Hacer clic en un espacio vacío con Seleccionar; la selección debe limpiarse.
10. Pulsar `🧹 Limpiar puntos`; confirmar la eliminación.
11. Crear un punto nuevamente e intentar volver a Mis proyectos; debe aparecer una advertencia de cambios locales no guardados.

---

## Limitaciones intencionales

Todavía NO existen:

- persistencia de geometría en MySQL;
- undo/redo;
- edición numérica de coordenadas;
- snap;
- líneas;
- polilíneas;
- regiones/estratos;
- DXF funcional.

Estas funciones se construirán progresivamente después de validar el núcleo de puntos y selección.
