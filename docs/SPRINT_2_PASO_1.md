# GeoFEM — Sprint 2 / Paso 1

## Modelo semántico de Estratos

### Objetivo

Separar explícitamente tres conceptos que no deben mezclarse:

1. **Región geométrica**: define únicamente un contorno cerrado mediante puntos.
2. **Estrato geotécnico**: aporta significado de dominio de suelo a una región.
3. **Material**: contendrá las propiedades constitutivas y resistentes que se asignarán en el siguiente paso.

La relación inicial del MVP es:

```text
R1 (región geométrica)
  ↓
E1 (estrato geotécnico)
  ↓
materialId = null
```

Un estrato no copia las coordenadas de su región. Guarda únicamente `regionId`.

---

## Estado interno

El esquema de `projectState` pasa a **2.0.0** porque comienza una nueva capa semántica del modelo.

```javascript
strata: {
    items: [],
    nextId: 1
}
```

Ejemplo:

```javascript
{
    id: "E1",
    nombre: "Estrato 1",
    regionId: "R1",
    materialId: null,
    displayColor: "#99d8c9",
    visible: true
}
```

`displayColor` es únicamente una propiedad de visualización del estrato en este paso. Las propiedades del suelo todavía no forman parte del estrato.

---

## Regla de integridad 1: una región, un estrato

En este MVP una misma región no puede generar dos estratos diferentes.

Esto evita estados ambiguos como:

```text
R1 → E1
R1 → E2   ✗
```

---

## Regla de integridad 2: no borrar una región usada

Si existe:

```text
E1.regionId = R1
```

GeoFEM no permite eliminar `R1` directamente.

El flujo correcto es:

```text
Eliminar E1
   ↓
R1 continúa existiendo
   ↓
Eliminar R1 si realmente se desea
```

Eliminar un estrato **nunca elimina automáticamente su geometría**.

---

## Archivo nuevo

```text
frontend/js/cad-strata.js
```

Responsabilidades principales:

- listar estratos;
- crear un estrato desde una región;
- seleccionar un estrato;
- actualizar nombre y color de visualización;
- eliminar un estrato;
- localizar el estrato asociado a una región;
- calcular su área a partir de la región;
- renderizar la capa semántica sin duplicar geometría.

---

## Interfaz

Se agrega el módulo superior:

```text
Estratos
```

Flujo de trabajo:

1. Entrar a **Geometría**.
2. Crear o seleccionar una región cerrada.
3. Entrar a **Estratos**.
4. Pulsar **Crear desde región seleccionada**.
5. GeoFEM crea `E1` y mantiene `R1` intacta.

El panel derecho permite modificar:

- nombre del estrato;
- color de visualización.

Además informa:

- ID del estrato;
- región asociada;
- área geométrica derivada;
- material, que en este paso permanece `Sin asignar`.

---

## Capa SVG

Se incorpora:

```html
<g id="strataLayer"></g>
```

La representación se deriva de:

```text
E1.regionId
    ↓
R1.pointIds
    ↓
coordenadas reales de P1, P2, ...
    ↓
modelToScreen()
    ↓
SVG
```

El SVG sigue sin ser fuente de verdad.

---

## Pruebas funcionales recomendadas

### Prueba 1 — Crear E1

Crear una región `R1`, seleccionarla, abrir Estratos y pulsar **Crear desde región seleccionada**.

Resultado esperado:

```text
Estratos: 1
E1 · Estrato 1
Región R1
Material: Sin asignar
```

### Prueba 2 — Área derivada

Para una región 10 m × 5 m:

```text
Área R1 = 50.000 m²
Área E1 = 50.000 m²
```

Editar un vértice de R1. El área mostrada para E1 debe cambiar automáticamente porque no existe una copia independiente de la geometría.

### Prueba 3 — Renombrar

Cambiar:

```text
Estrato 1
```

por:

```text
Suelo residual superior
```

El ID debe seguir siendo `E1`.

### Prueba 4 — Segundo estrato

Crear `R2` y generar otro estrato.

Resultado esperado:

```text
E1 → R1
E2 → R2
```

### Prueba 5 — No duplicar región

Intentar crear otro estrato a partir de R1.

GeoFEM debe impedirlo y seleccionar el estrato que ya utiliza esa región.

### Prueba 6 — Protección de R1

Con `E1 → R1`, intentar eliminar R1.

Debe rechazarse porque E1 depende de ella.

### Prueba 7 — Eliminar E1

Eliminar E1.

Resultado esperado:

```text
Estratos: 0
Regiones: 1
R1 sigue existiendo
```

Después de eliminar E1, R1 vuelve a poder eliminarse normalmente.

---

## Fuera del alcance de este paso

Todavía no se implementa:

- creación de materiales geotécnicos;
- propiedades E, ν, c', φ' y γ;
- asignación de material a estrato;
- persistencia de estratos en MySQL;
- mallado por estrato;
- operaciones booleanas entre regiones.

El siguiente paso debe introducir el catálogo de **Materiales geotécnicos** y luego enlazar `E1.materialId` con un material real.
