# GeoFEM — Sprint 1 / Paso 6

## Líneas CAD reales entre puntos

### Objetivo

Completar la segunda entidad geométrica básica del editor CAD: la **línea**.

Una línea no guarda una copia de las coordenadas. Guarda referencias estables a dos puntos existentes:

```javascript
{
    id: "L1",
    startPointId: "P1",
    endPointId: "P2"
}
```

Por tanto, las coordenadas siguen viviendo exclusivamente en P1 y P2. Si P2 cambia de posición, L1 se redibuja automáticamente usando la nueva posición de P2.

---

## 1. Archivos modificados

- `frontend/index.html`
- `frontend/js/project-state.js`
- `frontend/js/cad-geometry.js`

Archivo nuevo de documentación:

- `docs/SPRINT_1_PASO_6.md`

No se modifica `viewport.js` en este paso.

---

## 2. Flujo para crear una línea

1. Crear al menos dos puntos con `• Crear Punto`.
2. Activar `╱ Crear Línea`.
3. Hacer clic sobre el punto inicial, por ejemplo P1.
4. GeoFEM conserva temporalmente `P1` como inicio del borrador de línea.
5. Hacer clic sobre otro punto, por ejemplo P2.
6. GeoFEM crea:

```javascript
{
    id: "L1",
    startPointId: "P1",
    endPointId: "P2"
}
```

7. El contador `Líneas` aumenta.
8. L1 queda seleccionada.

No se crea una línea si se hace clic en un espacio vacío.

---

## 3. Identificadores estables

Las líneas usan contador monotónico:

```text
L1
L2
L3
...
```

Si L2 se elimina, la siguiente línea será L4; no se reutiliza L2.

Esto reduce ambigüedades cuando otras entidades empiecen a referenciar líneas.

---

## 4. Restricciones de integridad

GeoFEM impide:

### Línea sobre el mismo punto

```text
P1 → P1   ✗
```

Una línea requiere dos extremos distintos.

### Línea duplicada

Si ya existe:

```text
P1 → P2
```

no se permite crear otra equivalente:

```text
P1 → P2   ✗
P2 → P1   ✗
```

Para el modelo geométrico actual ambas representan la misma arista.

### Eliminar un punto utilizado

Si existe:

```text
P1 ─── L1 ─── P2
```

GeoFEM no permite borrar P1 ni P2 directamente. Primero debe eliminarse L1.

Esto evita referencias rotas dentro de `projectState`.

---

## 5. Selección de líneas

Con `↖ Seleccionar` puede hacerse clic sobre una línea.

La línea seleccionada se resalta en naranja y el panel derecho muestra:

- ID de línea;
- punto inicial;
- punto final;
- longitud en metros.

Ejemplo:

```text
Tipo: Línea
ID: L1
Punto inicial: P1
Punto final: P2
Longitud: 5.000 m
```

La longitud se calcula con las coordenadas actuales de sus extremos:

```text
L = sqrt((x2-x1)^2 + (y2-y1)^2)
```

No se almacena como dato duplicado.

---

## 6. Edición automática por referencia

Supóngase:

```text
P1 = (0,0)
P2 = (3,4)
L1 = P1 → P2
```

La longitud es 5 m.

Si se edita P2 y pasa a:

```text
P2 = (6,8)
```

no se modifica manualmente L1. La línea sigue referenciando `P1` y `P2`, se redibuja y su nueva longitud pasa a ser 10 m.

---

## 7. Eliminación de línea

Puede eliminarse una línea de dos formas:

- botón `Eliminar línea` del panel de propiedades;
- tecla `Supr/Delete` con la línea seleccionada.

Los puntos extremos se conservan.

```text
ANTES
P1 ●──── L1 ────● P2

DESPUÉS
P1 ●            ● P2
```

---

## 8. Escape

`Esc` cancela el primer extremo pendiente de una línea y limpia la selección.

Esto resulta útil si se activó `Crear Línea`, se eligió P1 y después se decide no terminar la línea.

---

## 9. Separación modelo / vista

Una línea real existe en:

```javascript
projectState.geometry.lines
```

El SVG solamente la representa.

El proceso sigue siendo:

```text
projectState
    ↓
renderGeometry()
    ↓
SVG
```

Por eso zoom y pan no cambian las coordenadas de P1/P2 ni la longitud real de L1.

---

## 10. Pruebas manuales recomendadas

### Prueba A — creación

1. Crear P1, P2 y P3.
2. Activar Crear Línea.
3. Hacer clic P1 y después P2.
4. Verificar `Líneas: 1`.
5. Crear P2 → P3.
6. Verificar `Líneas: 2`.

### Prueba B — selección

1. Activar Seleccionar.
2. Hacer clic sobre L1.
3. Verificar resaltado naranja.
4. Verificar ID, extremos y longitud en Propiedades.

### Prueba C — referencia viva

1. Seleccionar P2.
2. Anotar longitud de L1.
3. Editar coordenadas de P2.
4. Volver a seleccionar L1.
5. Verificar que la línea se movió y la longitud cambió.

### Prueba D — integridad

1. Con L1 = P1 → P2, seleccionar P1.
2. Intentar eliminar P1.
3. GeoFEM debe impedirlo e informar que el punto está conectado a una línea.
4. Eliminar L1.
5. Eliminar P1.
6. Ahora debe permitirse.

### Prueba E — duplicado

1. Crear L1 = P1 → P2.
2. Intentar crear otra P1 → P2 o P2 → P1.
3. GeoFEM debe rechazarla.

### Prueba F — cámara

1. Crear líneas.
2. Hacer zoom y pan.
3. Verificar que líneas y puntos se mueven visualmente juntos.
4. Verificar que las coordenadas y longitudes no cambian.

---

## 11. Estado esperado al finalizar

```text
Sprint 1

Paso 1  projectState                         ✓
Paso 2  coordenadas modelo ↔ SVG             ✓
Paso 3  zoom + pan + grid                    ✓
Paso 4  crear / seleccionar puntos           ✓
Paso 5  editar / eliminar puntos             ✓
Paso 6  líneas entre puntos                  ✓
```

La siguiente evolución natural será trabajar con **polilíneas**, de forma que una secuencia ordenada de puntos pueda representar perfiles, límites y posteriormente polígonos/estratos.
