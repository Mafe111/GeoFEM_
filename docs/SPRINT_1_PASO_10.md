# GeoFEM — Sprint 1 / Paso 10

## Edición topológica de regiones CAD

### Objetivo

Completar el ciclo de edición de una región cerrada antes de convertirla en un
estrato geotécnico. Una región ya no solo puede crearse, seleccionarse y
eliminarse: ahora su contorno puede modificarse de forma controlada sin perder
la validez geométrica.

La regla principal continúa siendo:

```text
projectState = fuente de verdad
SVG          = representación visual
```

Una región mantiene una lista ordenada de IDs de puntos:

```javascript
R1 = {
    id: "R1",
    pointIds: ["P1", "P2", "P3", "P4"],
    closed: true
}
```

El primer punto no se repite al final. El cierre último → primero es implícito.

---

## Funciones incorporadas

### 1. Insertar un vértice en un borde

Con una región seleccionada, el usuario puede activar:

```text
+ Vértice en borde
```

Después hace clic cerca de un borde. GeoFEM:

1. localiza el segmento de la región más cercano al cursor;
2. proyecta matemáticamente el clic sobre ese segmento;
3. crea un punto exactamente sobre el borde;
4. inserta el ID del nuevo punto en la posición correcta del contorno;
5. conserva la región cerrada y válida.

Ejemplo:

```text
Antes
P1 -------- P2
|            |
|     R1     |
P4 -------- P3

Después de insertar P5 en P1-P2
P1 ---- P5 ---- P2
|               |
|       R1      |
P4 ----------- P3
```

El nuevo punto es una entidad normal de `geometry.points`; por tanto puede
seleccionarse y editarse posteriormente.

---

### 2. Quitar un vértice del contorno

La acción:

```text
− Vértice del contorno
```

retira el ID del punto de `R1.pointIds`, pero NO elimina el punto del proyecto.

Ejemplo:

```text
R1 = P1 → P2 → P3 → P4 → P5
```

si se retira P3:

```text
R1 = P1 → P2 → P4 → P5
```

P3 continúa existiendo como punto independiente.

Esto separa correctamente dos operaciones diferentes:

```text
quitar del contorno ≠ eliminar punto
```

Una región nunca puede quedar con menos de tres vértices.

---

### 3. Invertir el sentido del contorno

Se incorpora:

```text
⇄ Invertir sentido
```

Ejemplo:

```text
P1 → P2 → P3 → P4
```

pasa a:

```text
P4 → P3 → P2 → P1
```

La superficie no cambia. Tampoco cambian el área ni el perímetro. Solo cambia
la orientación topológica del contorno.

La interfaz muestra:

```text
Antihorario (CCW)
```

o:

```text
Horario (CW)
```

En coordenadas del modelo, donde Y crece hacia arriba, un área firmada positiva
corresponde a orientación antihoraria.

---

## Validación de edición de puntos pertenecientes a regiones

En pasos anteriores era posible mover un punto y la región se actualizaba. A
partir de este paso, GeoFEM valida la geometría ANTES de aceptar el movimiento.

Si P2 pertenece a R1 y una nueva coordenada produciría:

- autointersección;
- área cero;
- dos vértices exactamente coincidentes;

la edición se rechaza y P2 conserva sus coordenadas anteriores.

Esto evita convertir accidentalmente una región válida en un polígono inválido.

---

## Herramientas temporales de edición

El `projectState.ui` incorpora:

```javascript
regionEditTargetId
```

Su única responsabilidad es recordar qué región se está editando mientras el
usuario utiliza una herramienta temporal como:

```text
region-insert
region-remove
```

No representa geometría y no se enviará al solver FEM.

El esquema pasa a:

```text
State 1.6.0
```

---

## Pruebas funcionales recomendadas

### Prueba A — Insertar vértice

Crear un rectángulo:

```text
P1 = (0,0)
P2 = (10,0)
P3 = (10,5)
P4 = (0,5)
```

Crear R1 y comprobar:

```text
Área = 50 m²
Perímetro = 30 m
```

Seleccionar R1 → `+ Vértice en borde` → clic aproximadamente en el centro del
borde P1-P2.

Resultado esperado:

```text
Vértices: 5
Área:      50 m²
Perímetro: 30 m
```

El área y perímetro permanecen iguales porque el punto nuevo está exactamente
sobre el segmento existente.

---

### Prueba B — Quitar vértice

Con R1 de cinco vértices:

1. seleccionar R1;
2. activar `− Vértice del contorno`;
3. hacer clic sobre el nuevo vértice.

Resultado esperado:

```text
R1 vuelve a 4 vértices
```

pero el punto retirado continúa visible como entidad independiente.

---

### Prueba C — Límite mínimo

Crear una región triangular de tres vértices e intentar quitar uno.

Resultado esperado:

```text
Operación rechazada
```

porque una región necesita al menos tres vértices.

---

### Prueba D — Movimiento inválido

Mover un vértice de una región hasta producir un "moño" o cruce del contorno.

Resultado esperado:

```text
Edición rechazada
Coordenadas originales conservadas
```

---

### Prueba E — Área cero

Intentar mover un vértice de un triángulo de modo que los tres vértices queden
alineados.

Resultado esperado:

```text
Edición rechazada por área cero
```

---

### Prueba F — Invertir sentido

Seleccionar R1 y anotar:

```text
Área
Perímetro
Sentido
```

Ejecutar `⇄ Invertir sentido`.

Resultado esperado:

```text
Área      = igual
Perímetro = igual
Sentido   = opuesto
```

---

### Prueba G — Caso irregular ya validado

El caso de referencia usado en el Paso 9 debe seguir produciendo:

```text
P1 = (10,24)
P2 = (28,24)
P3 = (50,14)
P4 = (50,6)
P5 = (10,6)

Contorno: P1 → P5 → P4 → P3 → P2 → P1
Área esperada:      610.000 m²
Perímetro esperado: 108.166 m
```

Esto funciona como prueba de regresión: la edición topológica no debe alterar
los cálculos geométricos previamente validados.

---

## Qué no se implementa todavía

Este paso no convierte regiones en estratos y no asigna materiales. Tampoco
implementa operaciones booleanas entre polígonos, agujeros, recorte entre
regiones ni unión/intersección de dominios.

La secuencia prevista continúa siendo:

```text
Región geométrica válida
        ↓
Edición topológica estable
        ↓
Estrato geotécnico
        ↓
Material
        ↓
Malla FEM
```

---

## Criterio de cierre del Paso 10

El paso se considera aprobado cuando:

```text
✓ se puede insertar un vértice sobre un borde
✓ se puede quitar un vértice sin borrar el punto
✓ no se puede bajar de tres vértices
✓ mover un punto no puede invalidar una región
✓ se muestra CW/CCW
✓ invertir orientación conserva área y perímetro
✓ el caso irregular de 610 m² continúa correcto
✓ zoom, pan, snap, puntos, líneas y polilíneas siguen funcionando
```
