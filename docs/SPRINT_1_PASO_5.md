# GeoFEM — Sprint 1 / Paso 5
## Edición y eliminación individual de puntos CAD

## Objetivo

Completar el ciclo de vida básico de una entidad tipo punto antes de comenzar a construir líneas.

Al finalizar este paso GeoFEM permitirá:

- crear puntos;
- seleccionar un punto;
- editar sus coordenadas X/Y;
- conservar su identificador al editar;
- eliminar únicamente el punto seleccionado;
- usar `Supr/Delete` como atajo de eliminación;
- usar `Esc` para limpiar la selección;
- evitar, desde la arquitectura, borrar un punto conectado a futuras líneas;
- mantener identificadores monotónicos sin reutilizar IDs eliminados.

---

## Por qué se hace antes de las líneas

Una línea CAD dependerá de dos puntos. Por ejemplo:

```text
L1
P1 ---------------- P2
```

Si permitimos borrar `P1` sin controlar dependencias, `L1` quedaría inválida. Por eso antes de implementar líneas estabilizamos el ciclo:

```text
crear → seleccionar → editar → eliminar
```

Después podremos construir líneas sobre entidades confiables.

---

## Cambio del schema interno

`projectState.schemaVersion` pasa de:

```text
1.0.0
```

a:

```text
1.1.0
```

La razón es que `geometry` ahora contiene contadores monotónicos:

```javascript
geometry: {
    points: [],
    lines: [],
    polylines: [],
    regions: [],
    nextIds: {
        point: 1,
        line: 1,
        polyline: 1,
        region: 1
    }
}
```

Esto evita reutilizar identificadores.

Ejemplo:

```text
Crear P1
Crear P2
Eliminar P1
Crear otro punto
```

El nuevo punto será:

```text
P3
```

no `P1`.

Esto será importante para persistencia, relaciones y futuro Undo/Redo.

---

## Edición de coordenadas

Al seleccionar un punto aparece un editor en Propiedades:

```text
Punto P2

X (m): [ 12.500 ]
Y (m): [  8.250 ]

[ Aplicar coordenadas ]
[ Eliminar punto ]
```

Al aplicar:

```text
inputs X/Y
   ↓
validación numérica
   ↓
GeoFEMGeometry.actualizarPunto()
   ↓
projectState.geometry.points
   ↓
renderizarProjectState()
   ↓
SVG
```

El ID no cambia.

---

## Eliminación individual

La interfaz principal deja de usar `Limpiar puntos` como acción primaria y utiliza:

```text
Eliminar seleccionado
```

El botón permanece deshabilitado mientras no exista un punto seleccionado.

También puede eliminarse mediante:

```text
Supr / Delete
```

siempre que el foco no esté dentro de un campo de texto.

---

## Protección de dependencias futuras

`cad-geometry.js` incorpora:

```javascript
lineasQueUsanPunto(state, id)
```

y:

```javascript
eliminarPunto(state, id)
```

Cuando existan líneas con estructura:

```javascript
{
    id: "L1",
    startPointId: "P1",
    endPointId: "P2"
}
```

GeoFEM bloqueará la eliminación de `P1` o `P2` mientras la línea continúe referenciándolos.

Esto protege la integridad topológica del modelo.

---

## Pruebas manuales recomendadas

### Prueba A — editar

1. Crear P1.
2. Seleccionarlo.
3. Cambiar X e Y desde Propiedades.
4. Pulsar `Aplicar coordenadas`.
5. Confirmar que el punto cambia visualmente de ubicación.
6. Confirmar que sigue llamándose P1.

### Prueba B — Enter

1. Seleccionar P1.
2. Cambiar X.
3. Pulsar Enter dentro del input.
4. Confirmar actualización.

### Prueba C — eliminación individual

1. Crear P1, P2 y P3.
2. Seleccionar P2.
3. Pulsar `Eliminar punto`.
4. Confirmar que solo desaparece P2.
5. Confirmar que P1 y P3 permanecen.

### Prueba D — IDs estables

Después de eliminar P2, crear otro punto.

Debe llamarse:

```text
P4
```

no P2.

### Prueba E — teclado

- `Esc`: limpia la selección.
- `Delete/Supr`: elimina el punto seleccionado previa confirmación.

### Prueba F — zoom/pan

Editar un punto y luego hacer zoom/pan.

Las coordenadas X/Y deben conservarse exactamente.

---

## Persistencia

Los puntos siguen siendo locales en este Sprint. Todavía no se guardan en MySQL.

Por tanto:

```text
dirty = true
```

continúa indicando cambios locales sin persistir.

La persistencia de geometría se abordará cuando la estructura de entidades CAD esté estabilizada.

---

## Próximo paso

Una vez validada la edición y eliminación individual, se podrá implementar una línea CAD real:

```text
P1 -------- P2
```

con referencias por ID y protección de integridad entre entidades.
