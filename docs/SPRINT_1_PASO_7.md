# GeoFEM — Sprint 1 / Paso 7

## Polilíneas CAD como entidades topológicas

### Objetivo

Incorporar una entidad `Polyline` real al modelo interno de GeoFEM sin duplicar líneas independientes ni almacenar coordenadas redundantes.

Una polilínea queda representada por una secuencia ordenada de referencias a puntos:

```javascript
{
    id: "PL1",
    pointIds: ["P1", "P2", "P3", "P4"]
}
```

Las coordenadas siguen viviendo exclusivamente en `geometry.points`.

---

## 1. Decisión arquitectónica

GeoFEM diferencia tres conceptos:

```text
Punto      = coordenada real del modelo
Línea      = relación independiente entre dos puntos
Polilínea  = secuencia ordenada de dos o más puntos
```

La polilínea **no genera automáticamente objetos `Line`**.

Esto evita mantener dos fuentes de verdad para un mismo tramo.

Visualmente:

```text
P1 ●──────● P2
           \
            \
             ● P3──────● P4
```

Internamente:

```text
PL1 = [P1, P2, P3, P4]
```

---

## 2. Estado del proyecto

La versión del estado pasa de:

```text
1.2.0
```

a:

```text
1.3.0
```

Se agregan dos campos de UI temporales:

```javascript
polylineDraftPointIds: [],
polylineDraftCursorModel: null
```

Estos datos sirven exclusivamente durante la creación interactiva de una polilínea.

No representan geometría final hasta que el usuario pulsa `Enter`.

---

## 3. Crear una polilínea

Flujo:

```text
Activar Crear Polilínea
        ↓
Clic P1
        ↓
Clic P2
        ↓
Clic P3
        ↓
Enter
        ↓
PL1 = [P1, P2, P3]
```

Durante el borrador se dibuja una línea discontinua naranja.

El tramo entre el último vértice y el cursor se muestra como previsualización.

---

## 4. Finalizar y cancelar

### Enter

Finaliza el borrador actual.

La polilínea necesita al menos dos puntos.

### Esc

Cancela el borrador completo sin modificar la geometría persistente en `projectState`.

---

## 5. Identificadores

Las polilíneas utilizan identificadores monotónicos:

```text
PL1
PL2
PL3
...
```

Si se elimina `PL2`, el siguiente identificador no vuelve a utilizarse.

Esto mantiene referencias estables.

---

## 6. Longitud total

La longitud no se almacena.

Se calcula a partir de los puntos actuales:

```text
P1 → P2 → P3
```

```text
Longitud total = |P1P2| + |P2P3|
```

Para cada tramo:

```text
L = sqrt((x2-x1)^2 + (y2-y1)^2)
```

Por eso, si se modifica un punto, la longitud de la polilínea cambia automáticamente.

---

## 7. Selección

Una polilínea puede seleccionarse con la herramienta:

```text
↖ Seleccionar
```

El panel de propiedades muestra:

```text
Tipo
ID
Número de vértices
Longitud total
Secuencia de puntos
```

Ejemplo:

```text
Tipo: Polilínea
ID: PL1
Vértices: 4
Longitud total: 24.381 m
Secuencia: P1 → P2 → P3 → P4
```

---

## 8. Eliminación

Eliminar una polilínea elimina únicamente la entidad `PL`.

Los puntos que forman sus vértices se conservan.

```text
Antes:
P1 ●────● P2────● P3
      PL1

Eliminar PL1

Después:
P1 ●    ● P2    ● P3
```

---

## 9. Protección de referencias

Un punto usado por una línea o polilínea no puede eliminarse directamente.

Ejemplo:

```text
PL1 = [P1, P2, P3]
```

Intentar eliminar `P2` produce una advertencia.

Primero debe eliminarse o modificarse la entidad que lo referencia.

Esto evita referencias topológicas rotas.

---

## 10. Duplicados

GeoFEM rechaza una polilínea con la misma secuencia que otra existente.

También considera equivalente la secuencia invertida.

```text
P1 → P2 → P3
```

y:

```text
P3 → P2 → P1
```

representan la misma polilínea para esta etapa del CAD.

---

## 11. Vértices repetidos

En este paso una polilínea abierta no acepta el mismo punto dos veces.

Esto evita:

- segmentos de longitud cero;
- secuencias ambiguas;
- cierres accidentales.

Los contornos cerrados se implementarán posteriormente de forma explícita mediante una propiedad de cierre/región, sin duplicar el primer punto al final del arreglo.

---

## 12. Renderizado

Las polilíneas se dibujan desde `projectState` utilizando SVG `<polyline>`.

El SVG continúa siendo únicamente una vista:

```text
projectState
     ↓
renderGeometry()
     ↓
SVG
```

No se recuperan coordenadas leyendo el SVG.

---

## 13. Colores de referencia

En este paso:

```text
Puntos             verde oscuro
Líneas             verde/turquesa
Polilíneas         azul
Selección/borrador naranja
```

Los colores son de interfaz y todavía no representan materiales geotécnicos.

---

## 14. Pruebas funcionales

### Prueba A — Crear

1. Crear `P1`, `P2`, `P3`, `P4`.
2. Activar `Crear Polilínea`.
3. Seleccionar P1 → P2 → P3 → P4.
4. Pulsar `Enter`.
5. Confirmar que aparece `PL1`.
6. Confirmar que `Polilíneas` pasa de 0 a 1.

### Prueba B — Vista previa

1. Iniciar otra polilínea.
2. Seleccionar P1.
3. Mover el mouse.
4. Confirmar que aparece un tramo naranja discontinuo desde P1 hasta el cursor.

### Prueba C — Selección

1. Activar `Seleccionar`.
2. Hacer clic sobre un tramo azul, lejos de los puntos.
3. Confirmar resaltado naranja.
4. Ver ID, vértices, longitud y secuencia en Propiedades.

### Prueba D — Geometría viva

1. Seleccionar uno de los puntos de PL1.
2. Editar X/Y.
3. Confirmar que PL1 se mueve.
4. Confirmar que su longitud total cambia sin editar PL1.

### Prueba E — Protección

1. Intentar eliminar un punto utilizado por PL1.
2. Confirmar que GeoFEM lo bloquea e informa la entidad que lo referencia.

### Prueba F — Eliminación

1. Seleccionar PL1.
2. Eliminarla.
3. Confirmar que los puntos permanecen.
4. Confirmar que ahora esos puntos pueden eliminarse si no tienen otras referencias.

### Prueba G — Cancelar

1. Empezar una polilínea.
2. Elegir varios vértices.
3. Pulsar `Esc`.
4. Confirmar que el borrador desaparece y no aumenta el contador.

---

## 15. Alcance que todavía NO entra

Este paso no implementa todavía:

- polilíneas cerradas;
- regiones;
- estratos;
- snap;
- insertar/quitar vértices de una polilínea ya finalizada;
- persistencia en MySQL;
- importación DXF;
- malla FEM.

---

## 16. Próximo paso

El siguiente bloque debe utilizar la topología construida aquí para avanzar hacia geometría geotécnica más útil.

La evolución recomendada es:

```text
Polilínea
   ↓
Snap / precisión de dibujo
   ↓
Contornos cerrados
   ↓
Regiones / estratos
```

Antes de generar malla, GeoFEM debe poder describir una geometría cerrada y consistente.
