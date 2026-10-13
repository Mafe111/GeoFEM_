# GeoFEM — Sprint 1 / Paso 8

## Snap y precisión geométrica

Este paso incorpora ayudas de precisión al viewport CAD antes de empezar a construir regiones cerradas y estratos.

## Objetivo

Permitir que el cursor pueda ajustarse de forma controlada a:

1. puntos/vértices existentes;
2. intersecciones del grid visible.

El snap es una ayuda de interfaz. No modifica por sí mismo la geometría existente y no marca el proyecto como `dirty`.

## Estado del proyecto

La versión del estado interno pasa a:

```text
State 1.4.0
```

Se incorporan:

```javascript
viewport.snap = {
    enabled: true,
    points: true,
    grid: true,
    tolerancePx: 12
}
```

y un candidato temporal de UI:

```javascript
ui.snapCandidate
```

El candidato no forma parte del modelo geométrico persistente.

## Nuevo módulo

Se incorpora:

```text
frontend/js/cad-snap.js
```

Responsabilidades principales:

- medir la tolerancia del snap en pantalla;
- buscar el punto existente más cercano;
- calcular la intersección de grid más cercana;
- priorizar snap a punto sobre snap a grid;
- mantener un candidato temporal;
- dibujar el indicador visual de snap.

## Prioridad

La prioridad actual es:

```text
Punto existente
      ↓
Grid visible
      ↓
Cursor libre
```

Esto evita que el grid desplace el cursor cuando hay un vértice real suficientemente cerca.

## Tolerancia de pantalla

La tolerancia se configura en píxeles, por defecto:

```text
12 px
```

Se convierte a unidades internas SVG usando la transformación real del elemento SVG.

Por tanto, la sensación de captura se mantiene aproximadamente constante aunque cambie el zoom.

## Snap a punto

Cuando el cursor entra dentro de la tolerancia de un punto existente se muestra un marcador cuadrado y su ID.

Ejemplo:

```text
P3
□
```

Las herramientas `Crear Línea` y `Crear Polilínea` pueden utilizar ese punto aunque el usuario no haga clic exactamente sobre el círculo visual.

## Crear Punto y puntos existentes

Si `Crear Punto` detecta snap sobre un punto existente, GeoFEM no crea un punto duplicado.

En su lugar selecciona el punto existente.

Esto reduce duplicados topológicos accidentales.

## Snap al grid

Para `Crear Punto`, si no existe un punto dentro de la tolerancia y el snap de grid está activo, el cursor puede ajustarse a la intersección más cercana del grid visible.

El grid actual sigue siendo dinámico, por lo que su espaciamiento depende del zoom.

Este comportamiento es adecuado para el MVP actual. En una evolución posterior puede desacoplarse el espaciado visual del grid y el paso de captura si se requiere una precisión fija configurable.

## Indicador visual

El SVG incorpora una capa independiente:

```html
<g id="snapLayer"></g>
```

Esta capa es únicamente de interfaz y no pertenece al modelo FEM.

Indicadores actuales:

- punto: marcador cuadrado turquesa;
- grid: rombo violeta;
- etiqueta `P1`, `P2`, etc. o `GRID`.

## Interfaz

En `Viewport CAD` se incorpora:

```text
Precisión CAD · Snap
☑ Activar snap (F3)
☑ Vértices existentes
☑ Grid visible
Tolerancia: 12 px
Candidato: --
```

La barra de estado también muestra el candidato activo.

## Atajo

```text
F3
```

activa o desactiva el snap general.

## Herramientas afectadas

### Crear Punto

Usa:

- snap a punto;
- snap a grid.

### Crear Línea

Usa:

- snap a punto.

No utiliza grid porque una línea debe referenciar IDs de puntos existentes.

### Crear Polilínea

Usa:

- snap a punto.

No utiliza grid por la misma razón topológica.

### Seleccionar

No se modifica su comportamiento. Continúa usando las áreas de selección de las entidades.

## Flujo conceptual

```text
Mouse
  ↓
clientX/clientY
  ↓
SVG
  ↓
coordenada modelo cruda
  ↓
resolver snap
  ├── punto existente
  ├── grid
  └── sin snap
  ↓
coordenada efectiva
  ↓
herramienta CAD
```

## Pruebas recomendadas

### Prueba 1 — Snap a grid

1. Activar `Crear Punto`.
2. Mantener Snap y Grid activos.
3. Acercar el cursor a una intersección.
4. Verificar el rombo `GRID`.
5. Hacer clic.
6. Comprobar que las coordenadas del punto coinciden con la intersección.

### Prueba 2 — Snap a punto

1. Crear `P1`.
2. Mantener `Crear Punto`.
3. Acercarse a `P1`.
4. Verificar el cuadrado y etiqueta `P1`.
5. Hacer clic.
6. Comprobar que no se crea `P2`; se selecciona `P1`.

### Prueba 3 — Línea con tolerancia

1. Crear dos puntos.
2. Activar `Crear Línea`.
3. Hacer clic cerca de P1, sin necesidad de hacerlo exactamente encima.
4. Hacer clic cerca de P2.
5. Verificar que se crea la línea usando los IDs correctos.

### Prueba 4 — Polilínea

Repetir el comportamiento anterior con varios puntos y finalizar con `Enter`.

### Prueba 5 — F3

1. Moverse cerca de un punto y comprobar el indicador.
2. Pulsar `F3`.
3. Comprobar `Snap: OFF`.
4. Verificar que desaparece el marcador.
5. Pulsar `F3` otra vez.

### Prueba 6 — Zoom

Cambiar el zoom y verificar que la tolerancia visual sigue siendo razonablemente constante.

### Prueba 7 — Configuración

Probar de forma independiente:

- solo vértices;
- solo grid;
- ambos;
- snap desactivado.

## Validaciones técnicas realizadas

Se validó:

- sintaxis JavaScript de `project-state.js`;
- sintaxis de `cad-snap.js`;
- sintaxis del JavaScript inline de `index.html`;
- prioridad punto > grid;
- snap de grid a coordenadas esperadas;
- desactivación de grid para herramientas topológicas;
- desactivación general del snap.

## Fuera de alcance de este paso

Todavía no se implementa:

- snap a punto medio;
- snap perpendicular;
- snap a intersecciones entre segmentos;
- snap angular;
- ortogonalidad;
- regiones cerradas;
- estratos;
- persistencia de geometría en MySQL.

Estas capacidades deben incorporarse progresivamente sin mezclar la representación SVG con la fuente de verdad geométrica.
