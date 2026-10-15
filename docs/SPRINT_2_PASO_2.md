# GeoFEM — Sprint 2 / Paso 2
## Dominio del talud e interfaces estratigráficas

### Objetivo

Introducir un modelo geológico explícito previo a la creación automática de estratos. GeoFEM deja de interpretar una región cualquiera como estrato y separa:

- **D1 — Dominio del talud:** referencia una región CAD cerrada que delimita todo el dominio FEM.
- **I1, I2, ... — Interfaces estratigráficas:** referencian polilíneas CAD internas que separan unidades geológicas.
- **Estratos:** se generarán en el Paso 3 a partir de la partición de D1 por sus interfaces.

La geometría sigue siendo fuente única de coordenadas. D1 e I# solo almacenan referencias.

```text
R1 (región CAD) -> D1 (dominio)
PL1 (polilínea CAD) -> I1 (interfaz)
D1 + I1 + I2 -> Paso 3 -> E1 + E2 + E3
```

### Estado interno

La versión de esquema pasa a **2.1.0** y se incorpora:

```javascript
geology: {
    domain: null,
    interfaces: {
        items: [],
        nextId: 1
    }
}
```

Ejemplo:

```javascript
geology: {
    domain: { id: "D1", regionId: "R1" },
    interfaces: {
        items: [
            { id: "I1", polylineId: "PL1" },
            { id: "I2", polylineId: "PL2" }
        ],
        nextId: 3
    }
}
```

### Reglas del dominio

- Solo existe un dominio D1 en este MVP.
- D1 debe referenciar una región CAD existente.
- La región fuente no se duplica.
- D1 no puede eliminarse mientras existan interfaces.
- La región fuente no puede eliminarse mientras sea D1.

### Reglas de una interfaz

Una polilínea puede convertirse en interfaz si:

1. Existe D1.
2. Tiene al menos dos vértices.
3. Sus dos extremos son **vértices reales del contorno de D1**.
4. Sus vértices internos permanecen dentro del dominio.
5. Solo sus extremos tocan el borde exterior.
6. Ningún segmento sale del dominio, incluso si D1 es cóncavo.
7. La polilínea no se cruza consigo misma.
8. No cruza, toca ni se solapa con otra interfaz registrada.
9. La misma polilínea no está registrada dos veces.

Para crear un extremo exacto en mitad de un borde de D1, debe utilizarse la herramienta **+ Vértice en borde** del Sprint 1 / Paso 10 antes de construir la polilínea.

### Integridad referencial

- Una polilínea registrada como I# no puede eliminarse hasta quitar el rol de interfaz.
- La región D1 no puede eliminarse hasta quitar el rol de dominio.
- Si se mueve un punto que participa en D1 o una interfaz, GeoFEM simula el cambio y lo rechaza si invalida el modelo geológico.
- Retirar vértices del dominio se bloquea mientras existan interfaces; primero deben retirarse las interfaces.

### Renderizado

El SVG incorpora una capa semántica `geologyLayer`:

- D1 se marca con contorno verde azulado discontinuo.
- I# se dibuja como una línea violeta más gruesa.
- Las etiquetas D1/I# no forman parte de la geometría FEM.

### Flujo de uso

```text
1. Geometría -> crear región exterior R1
2. Estratos -> definir R1 como D1
3. Geometría -> insertar vértices exactos en los bordes si hace falta
4. Geometría -> crear PL1 entre dos vértices del borde
5. Estratos -> registrar PL1 como I1
6. Repetir para I2, I3...
7. Paso 3 -> particionar D1 y generar estratos derivados
```

### Decisión de arquitectura

La creación directa de estratos desde regiones del Paso 1 queda como compatibilidad del prototipo, pero el nuevo panel ya no ofrece esa acción. Si existen estratos directos en memoria, deben eliminarse antes de definir D1. El flujo estable será:

```text
Geometría CAD
    -> Modelo geológico D1/I#
        -> Regiones estratigráficas derivadas
            -> Estratos E#
                -> Materiales M#
                    -> Malla FEM
```

### Fuera de alcance de este paso

- Partición geométrica automática D1 + I#.
- Lentes/inclusiones cerradas internas.
- Materiales.
- Mallado conforme.
- Persistencia del modelo geológico en MySQL.

Estos puntos se abordarán en pasos posteriores.
