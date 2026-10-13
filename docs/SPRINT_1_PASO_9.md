# GeoFEM — Sprint 1 / Paso 9
## Regiones CAD cerradas y validación topológica básica

### Objetivo
Incorporar una entidad geométrica cerrada que pueda utilizarse posteriormente como dominio de suelo, estrato o región de mallado, sin duplicar el primer vértice al final de la secuencia.

### Modelo de datos
Una región se almacena así:

```javascript
{
    id: "R1",
    pointIds: ["P1", "P2", "P3", "P4"],
    closed: true
}
```

El cierre `P4 → P1` es implícito. No se guarda `P1` dos veces.

### Nuevos estados de UI
`projectState.ui` incorpora:

```javascript
regionDraftPointIds: []
regionDraftCursorModel: null
```

La versión de esquema pasa a `1.5.0`.

### Nuevo módulo
Se agrega:

```text
frontend/js/cad-regions.js
```

Responsabilidades principales:

- crear y seleccionar regiones;
- administrar el borrador de región;
- cerrar una región al volver al primer vértice;
- calcular área por fórmula del zapatero (shoelace);
- calcular perímetro;
- rechazar regiones con menos de tres vértices;
- rechazar vértices repetidos;
- rechazar área cero;
- rechazar autointersecciones;
- rechazar regiones geométricamente duplicadas, incluso con inicio diferente o sentido inverso;
- renderizar relleno, contorno, borrador y selección;
- eliminar una región conservando sus puntos.

### Flujo de creación
1. Crear al menos tres puntos.
2. Activar `◇ Crear Región`.
3. Seleccionar puntos consecutivos usando snap.
4. Volver al primer punto para cerrar, o pulsar `Enter` una vez existan al menos tres vértices.
5. GeoFEM valida el contorno.
6. Si es válido se crea `R1`, `R2`, etc.

### Validaciones topológicas iniciales
Se rechazan:

- menos de tres vértices;
- repetir un vértice intermedio;
- tres o más puntos colineales que produzcan área cero;
- polígonos tipo “moño” que se cruzan a sí mismos;
- la misma región creada con una rotación de la secuencia;
- la misma región recorrida en sentido contrario.

### Dependencias
Los puntos usados por una región quedan protegidos. Un punto no puede eliminarse mientras `R1`, `R2`, etc. lo referencien.

Eliminar una región no elimina sus vértices.

### Renderizado
Las regiones se dibujan en una capa propia debajo de líneas, polilíneas y puntos:

```text
regionLayer
geometryLayer
...
regionSelectionLayer
selectionLayer
```

Esto permite seleccionar los vértices con prioridad, manteniendo a la vez un área clicable para seleccionar la región.

### Propiedades mostradas
Al seleccionar una región se visualizan:

- ID;
- número de vértices;
- área en m²;
- perímetro en m;
- secuencia cerrada de puntos.

### Alcance deliberadamente excluido
Este paso todavía no asigna materiales ni convierte una región en un estrato. Tampoco persiste la geometría CAD en MySQL. Primero se valida la topología de regiones; la semántica geotécnica se añadirá en pasos posteriores.

### Pruebas recomendadas
- crear un triángulo y cerrarlo volviendo a P1;
- crear un cuadrilátero y finalizar con Enter;
- verificar área y perímetro;
- editar un punto y comprobar que cambian área y forma;
- intentar eliminar un punto usado por una región;
- eliminar la región y comprobar que los puntos permanecen;
- crear un “moño” y confirmar que se rechaza por autointersección;
- crear tres puntos colineales y confirmar que se rechaza por área cero;
- intentar recrear la misma región empezando en otro vértice o recorriéndola al revés;
- cancelar un borrador con Esc.
