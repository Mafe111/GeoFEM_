# GeoFEM — Sprint 1 / Paso 3

## Objetivo

Convertir el viewport del Sprint 1 en una cámara CAD interactiva sin modificar todavía la geometría del modelo. Este paso incorpora:

- zoom con la rueda del mouse, centrado bajo el cursor;
- pan con botón central o con `Shift + arrastre izquierdo`;
- grid dinámico en coordenadas reales del modelo;
- indicador de zoom, separación del grid y desplazamiento de cámara;
- botón **Restablecer vista**;
- scroll independiente en el panel de propiedades.

## Idea central

La geometría sigue almacenada en `projectState.geometry`. Zoom y pan solo cambian `projectState.viewport`. Por ello, acercar o mover la vista nunca altera las coordenadas geotécnicas.

```text
Modelo (metros)
      │
      ├── permanece igual
      │
Viewport
  zoom / pan
      │
      ▼
SVG mostrado
```

## Zoom bajo el cursor

Antes de cambiar el zoom se calcula qué punto del modelo está bajo el cursor. Después de modificar el factor de zoom se corrige el `pan` para que ese mismo punto vuelva a ocupar la misma posición SVG. Esto evita que el usuario "pierda" la zona que estaba observando.

## Pan

Durante un arrastre de pan se calcula el desplazamiento en unidades internas del SVG y se acumula en:

```javascript
projectState.viewport.pan.x
projectState.viewport.pan.y
```

El pan no mueve los puntos del modelo. Solo mueve la cámara.

## Grid dinámico

El grid se genera a partir de las coordenadas visibles del modelo. El espaciado menor utiliza la serie `1 - 2 - 5 × 10^n` para obtener valores fáciles de interpretar, por ejemplo:

```text
0.1 m
0.2 m
0.5 m
1 m
2 m
5 m
10 m
```

Al acercar o alejar la vista el grid cambia automáticamente de separación para no saturar la pantalla. Cada quinta línea se dibuja como línea mayor.

## Controles

- **Rueda hacia arriba:** acercar.
- **Rueda hacia abajo:** alejar.
- **Botón central + arrastrar:** pan.
- **Shift + botón izquierdo + arrastrar:** pan alternativo.
- **Restablecer vista:** zoom 100 % y pan `(0,0)`.

## Pruebas manuales

1. Abrir un proyecto.
2. Colocar el cursor sobre el origen y usar la rueda: el origen debe permanecer aproximadamente bajo el cursor.
3. Alejarse y acercarse: el indicador de zoom debe cambiar.
4. Comprobar que `Grid menor` cambia entre pasos legibles.
5. Realizar pan con botón central o `Shift + arrastre izquierdo`.
6. Verificar que los ejes y el grid se desplazan juntos.
7. Pulsar **Restablecer vista** y confirmar `Zoom = 100 %` y `Pan SVG = (0.0, 0.0)`.
8. Confirmar que `Puntos`, `Líneas`, `Regiones`, `Nodos` y `Elementos` permanecen en cero: mover la cámara no crea geometría.

## Archivos modificados

- `frontend/index.html`
- `frontend/js/project-state.js`
- `frontend/js/viewport.js`
- `docs/SPRINT_1_PASO_3.md`

## Lo que todavía NO hace este paso

No crea puntos, líneas, polígonos ni entidades geotécnicas. Tampoco guarda zoom/pan en MySQL. El siguiente bloque podrá empezar a utilizar esta cámara para selección y dibujo real.
