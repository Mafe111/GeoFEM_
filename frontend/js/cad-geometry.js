/*
 * GeoFEM - Geometría CAD básica
 * -----------------------------
 * Sprint 1 / Paso 9
 *
 * Responsabilidades actuales:
 *   - crear, seleccionar, editar y eliminar puntos;
 *   - crear líneas entre puntos existentes;
 *   - crear polilíneas como entidades topológicas propias;
 *   - seleccionar y eliminar líneas/polilíneas;
 *   - calcular longitudes geométricas;
 *   - impedir que se elimine un punto referenciado;
 *   - dibujar geometría, borradores y selección desde projectState.
 *
 * Importante:
 * El SVG NO es la fuente de verdad. Cada entidad se vuelve a generar desde
 * projectState cada vez que cambia el viewport o el modelo.
 */

(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    function numeroFinito(valor, respaldo = 0) {
        const numero = Number(valor);
        return Number.isFinite(numero) ? numero : respaldo;
    }

    function marcarModificado(state) {
        if (global.GeoFEMState?.marcarModificado) {
            global.GeoFEMState.marcarModificado(state, true);
        } else if (state) {
            state.dirty = true;
        }
    }

    function puntos(state) {
        if (!state?.geometry || !Array.isArray(state.geometry.points)) {
            return [];
        }
        return state.geometry.points;
    }

    function lineas(state) {
        if (!state?.geometry || !Array.isArray(state.geometry.lines)) {
            return [];
        }
        return state.geometry.lines;
    }

    function polilineas(state) {
        if (!state?.geometry || !Array.isArray(state.geometry.polylines)) {
            return [];
        }
        return state.geometry.polylines;
    }

    function regiones(state) {
        if (!state?.geometry || !Array.isArray(state.geometry.regions)) {
            return [];
        }
        return state.geometry.regions;
    }

    function asegurarNextIds(state) {
        const geometry = state?.geometry;
        if (!geometry) {
            throw new Error("projectState no contiene geometry.");
        }

        if (!geometry.nextIds || typeof geometry.nextIds !== "object") {
            geometry.nextIds = {};
        }

        return geometry.nextIds;
    }

    function siguienteIdPunto(state) {
        const nextIds = asegurarNextIds(state);
        let numero = Number(nextIds.point);

        if (!Number.isInteger(numero) || numero < 1) {
            numero = puntos(state).reduce((maximo, punto) => {
                const match = /^P(\d+)$/.exec(String(punto.id));
                return match ? Math.max(maximo, Number(match[1])) : maximo;
            }, 0) + 1;
        }

        nextIds.point = numero + 1;
        return `P${numero}`;
    }

    function siguienteIdLinea(state) {
        const nextIds = asegurarNextIds(state);
        let numero = Number(nextIds.line);

        if (!Number.isInteger(numero) || numero < 1) {
            numero = lineas(state).reduce((maximo, linea) => {
                const match = /^L(\d+)$/.exec(String(linea.id));
                return match ? Math.max(maximo, Number(match[1])) : maximo;
            }, 0) + 1;
        }

        nextIds.line = numero + 1;
        return `L${numero}`;
    }

    function siguienteIdPolilinea(state) {
        const nextIds = asegurarNextIds(state);
        let numero = Number(nextIds.polyline);

        if (!Number.isInteger(numero) || numero < 1) {
            numero = polilineas(state).reduce((maximo, polilinea) => {
                const match = /^PL(\d+)$/.exec(String(polilinea.id));
                return match ? Math.max(maximo, Number(match[1])) : maximo;
            }, 0) + 1;
        }

        nextIds.polyline = numero + 1;
        return `PL${numero}`;
    }

    function obtenerPunto(state, id) {
        return puntos(state).find((punto) => String(punto.id) === String(id)) || null;
    }

    function obtenerLinea(state, id) {
        return lineas(state).find((linea) => String(linea.id) === String(id)) || null;
    }

    function obtenerPolilinea(state, id) {
        return polilineas(state).find(
            (polilinea) => String(polilinea.id) === String(id)
        ) || null;
    }

    function limpiarSeleccion(state) {
        if (!state?.ui) {
            return;
        }
        state.ui.selection = [];
    }

    function seleccionarPunto(state, id) {
        const punto = obtenerPunto(state, id);

        if (!punto || !state?.ui) {
            limpiarSeleccion(state);
            return null;
        }

        state.ui.selection = [{type: "point", id: punto.id}];
        return punto;
    }

    function seleccionarLinea(state, id) {
        const linea = obtenerLinea(state, id);

        if (!linea || !state?.ui) {
            limpiarSeleccion(state);
            return null;
        }

        state.ui.selection = [{type: "line", id: linea.id}];
        return linea;
    }

    function seleccionarPolilinea(state, id) {
        const polilinea = obtenerPolilinea(state, id);

        if (!polilinea || !state?.ui) {
            limpiarSeleccion(state);
            return null;
        }

        state.ui.selection = [{type: "polyline", id: polilinea.id}];
        return polilinea;
    }

    function seleccionActual(state) {
        return Array.isArray(state?.ui?.selection)
            ? state.ui.selection[0] || null
            : null;
    }

    function puntoSeleccionado(state) {
        const seleccion = seleccionActual(state);
        if (!seleccion || seleccion.type !== "point") {
            return null;
        }
        return obtenerPunto(state, seleccion.id);
    }

    function lineaSeleccionada(state) {
        const seleccion = seleccionActual(state);
        if (!seleccion || seleccion.type !== "line") {
            return null;
        }
        return obtenerLinea(state, seleccion.id);
    }

    function polilineaSeleccionada(state) {
        const seleccion = seleccionActual(state);
        if (!seleccion || seleccion.type !== "polyline") {
            return null;
        }
        return obtenerPolilinea(state, seleccion.id);
    }

    function crearPunto(state, coordenada = {}) {
        if (!state?.geometry || !Array.isArray(state.geometry.points)) {
            throw new Error("projectState no contiene geometry.points.");
        }

        const punto = {
            id: siguienteIdPunto(state),
            x: numeroFinito(coordenada.x, 0),
            y: numeroFinito(coordenada.y, 0),
        };

        state.geometry.points.push(punto);
        seleccionarPunto(state, punto.id);
        marcarModificado(state);
        return punto;
    }

    function actualizarPunto(state, id, coordenada = {}) {
        const punto = obtenerPunto(state, id);
        if (!punto) {
            return {ok: false, reason: "not_found", punto: null};
        }

        const x = Number(coordenada.x);
        const y = Number(coordenada.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return {ok: false, reason: "invalid_coordinate", punto};
        }

        // Si el punto forma parte de una región cerrada, la edición no puede
        // dejar el contorno con área cero ni con autointersecciones. La
        // validación vive en cad-regions.js para mantener separadas las
        // responsabilidades geométricas.
        if (global.GeoFEMRegions?.validarMovimientoPunto) {
            const validacion = global.GeoFEMRegions.validarMovimientoPunto(
                state,
                punto.id,
                {x, y}
            );
            if (!validacion.ok) {
                return {
                    ok: false,
                    reason: validacion.reason,
                    punto,
                    regionId: validacion.regionId || null,
                    regionIds: validacion.regionIds || [],
                };
            }
        }

        const cambio = punto.x !== x || punto.y !== y;
        punto.x = x;
        punto.y = y;
        seleccionarPunto(state, punto.id);

        if (cambio) {
            marcarModificado(state);
        }

        return {ok: true, changed: cambio, punto};
    }

    function lineasQueUsanPunto(state, id) {
        return lineas(state).filter((linea) => {
            const inicio = linea.startPointId ?? linea.puntoInicialId ?? null;
            const fin = linea.endPointId ?? linea.puntoFinalId ?? null;
            return String(inicio) === String(id) || String(fin) === String(id);
        });
    }

    function polilineasQueUsanPunto(state, id) {
        return polilineas(state).filter((polilinea) =>
            Array.isArray(polilinea.pointIds) &&
            polilinea.pointIds.some((pointId) => String(pointId) === String(id))
        );
    }

    function regionesQueUsanPunto(state, id) {
        return regiones(state).filter((region) =>
            Array.isArray(region.pointIds) &&
            region.pointIds.some((pointId) => String(pointId) === String(id))
        );
    }

    function referenciasQueUsanPunto(state, id) {
        return [
            ...lineasQueUsanPunto(state, id).map((linea) => ({
                type: "line",
                id: linea.id,
            })),
            ...polilineasQueUsanPunto(state, id).map((polilinea) => ({
                type: "polyline",
                id: polilinea.id,
            })),
            ...regionesQueUsanPunto(state, id).map((region) => ({
                type: "region",
                id: region.id,
            })),
        ];
    }

    function existeLineaEntre(state, puntoAId, puntoBId) {
        return lineas(state).some((linea) => {
            const inicio = String(linea.startPointId);
            const fin = String(linea.endPointId);
            const a = String(puntoAId);
            const b = String(puntoBId);
            return (inicio === a && fin === b) || (inicio === b && fin === a);
        });
    }

    function crearLinea(state, startPointId, endPointId) {
        const inicio = obtenerPunto(state, startPointId);
        const fin = obtenerPunto(state, endPointId);

        if (!inicio || !fin) {
            return {ok: false, reason: "point_not_found", linea: null};
        }

        if (String(inicio.id) === String(fin.id)) {
            return {ok: false, reason: "same_point", linea: null};
        }

        if (existeLineaEntre(state, inicio.id, fin.id)) {
            return {ok: false, reason: "duplicate", linea: null};
        }

        const linea = {
            id: siguienteIdLinea(state),
            startPointId: inicio.id,
            endPointId: fin.id,
        };

        state.geometry.lines.push(linea);
        seleccionarLinea(state, linea.id);
        marcarModificado(state);

        return {ok: true, reason: null, linea};
    }

    function longitudLinea(state, lineaOId) {
        const linea = typeof lineaOId === "object"
            ? lineaOId
            : obtenerLinea(state, lineaOId);

        if (!linea) {
            return null;
        }

        const inicio = obtenerPunto(state, linea.startPointId);
        const fin = obtenerPunto(state, linea.endPointId);
        if (!inicio || !fin) {
            return null;
        }

        return Math.hypot(fin.x - inicio.x, fin.y - inicio.y);
    }

    function eliminarLinea(state, id) {
        const lista = lineas(state);
        const indice = lista.findIndex((linea) => String(linea.id) === String(id));

        if (indice < 0) {
            return {ok: false, reason: "not_found", linea: null};
        }

        const [eliminada] = lista.splice(indice, 1);
        const seleccion = seleccionActual(state);
        if (seleccion?.type === "line" && String(seleccion.id) === String(id)) {
            limpiarSeleccion(state);
        }

        marcarModificado(state);
        return {ok: true, reason: null, linea: eliminada};
    }

    function eliminarLineaSeleccionada(state) {
        const linea = lineaSeleccionada(state);
        if (!linea) {
            return {ok: false, reason: "no_selection", linea: null};
        }
        return eliminarLinea(state, linea.id);
    }

    function asegurarBorradorPolilinea(state) {
        if (!state?.ui) {
            throw new Error("projectState no contiene ui.");
        }

        if (!Array.isArray(state.ui.polylineDraftPointIds)) {
            state.ui.polylineDraftPointIds = [];
        }

        return state.ui.polylineDraftPointIds;
    }

    function cancelarBorradorPolilinea(state) {
        if (!state?.ui) {
            return;
        }

        state.ui.polylineDraftPointIds = [];
        state.ui.polylineDraftCursorModel = null;
    }

    function actualizarCursorBorradorPolilinea(state, coordenada = null) {
        if (!state?.ui) {
            return;
        }

        if (!coordenada) {
            state.ui.polylineDraftCursorModel = null;
            return;
        }

        const x = Number(coordenada.x);
        const y = Number(coordenada.y);
        state.ui.polylineDraftCursorModel =
            Number.isFinite(x) && Number.isFinite(y)
                ? {x, y}
                : null;
    }

    function agregarVerticeBorradorPolilinea(state, pointId) {
        const punto = obtenerPunto(state, pointId);
        if (!punto) {
            return {ok: false, reason: "point_not_found", pointIds: []};
        }

        const pointIds = asegurarBorradorPolilinea(state);
        const ultimo = pointIds[pointIds.length - 1];

        if (ultimo !== undefined && String(ultimo) === String(punto.id)) {
            return {ok: false, reason: "same_consecutive_point", pointIds: [...pointIds]};
        }

        if (pointIds.some((id) => String(id) === String(punto.id))) {
            return {ok: false, reason: "duplicate_vertex", pointIds: [...pointIds]};
        }

        pointIds.push(punto.id);
        return {ok: true, reason: null, pointIds: [...pointIds]};
    }

    function secuenciasEquivalentes(a = [], b = []) {
        if (a.length !== b.length) {
            return false;
        }

        const iguales = a.every((id, indice) => String(id) === String(b[indice]));
        if (iguales) {
            return true;
        }

        return a.every(
            (id, indice) => String(id) === String(b[b.length - 1 - indice])
        );
    }

    function existePolilineaEquivalente(state, pointIds = []) {
        return polilineas(state).some((polilinea) =>
            Array.isArray(polilinea.pointIds) &&
            secuenciasEquivalentes(polilinea.pointIds, pointIds)
        );
    }

    function crearPolilinea(state, pointIds = []) {
        const ids = Array.isArray(pointIds) ? [...pointIds] : [];

        if (ids.length < 2) {
            return {ok: false, reason: "insufficient_vertices", polilinea: null};
        }

        const unicos = new Set(ids.map(String));
        if (unicos.size !== ids.length) {
            return {ok: false, reason: "duplicate_vertex", polilinea: null};
        }

        if (ids.some((id) => !obtenerPunto(state, id))) {
            return {ok: false, reason: "point_not_found", polilinea: null};
        }

        if (existePolilineaEquivalente(state, ids)) {
            return {ok: false, reason: "duplicate", polilinea: null};
        }

        const polilinea = {
            id: siguienteIdPolilinea(state),
            pointIds: ids,
        };

        state.geometry.polylines.push(polilinea);
        cancelarBorradorPolilinea(state);
        seleccionarPolilinea(state, polilinea.id);
        marcarModificado(state);

        return {ok: true, reason: null, polilinea};
    }

    function finalizarBorradorPolilinea(state) {
        const ids = asegurarBorradorPolilinea(state);
        return crearPolilinea(state, ids);
    }

    function longitudPolilinea(state, polilineaOId) {
        const polilinea = typeof polilineaOId === "object"
            ? polilineaOId
            : obtenerPolilinea(state, polilineaOId);

        if (!polilinea || !Array.isArray(polilinea.pointIds)) {
            return null;
        }

        let longitud = 0;
        for (let i = 1; i < polilinea.pointIds.length; i += 1) {
            const a = obtenerPunto(state, polilinea.pointIds[i - 1]);
            const b = obtenerPunto(state, polilinea.pointIds[i]);
            if (!a || !b) {
                return null;
            }
            longitud += Math.hypot(b.x - a.x, b.y - a.y);
        }

        return longitud;
    }

    function eliminarPolilinea(state, id) {
        const lista = polilineas(state);
        const indice = lista.findIndex(
            (polilinea) => String(polilinea.id) === String(id)
        );

        if (indice < 0) {
            return {ok: false, reason: "not_found", polilinea: null};
        }

        const [eliminada] = lista.splice(indice, 1);
        const seleccion = seleccionActual(state);
        if (
            seleccion?.type === "polyline" &&
            String(seleccion.id) === String(id)
        ) {
            limpiarSeleccion(state);
        }

        marcarModificado(state);
        return {ok: true, reason: null, polilinea: eliminada};
    }

    function eliminarPolilineaSeleccionada(state) {
        const polilinea = polilineaSeleccionada(state);
        if (!polilinea) {
            return {ok: false, reason: "no_selection", polilinea: null};
        }
        return eliminarPolilinea(state, polilinea.id);
    }

    function eliminarPunto(state, id, opciones = {}) {
        const lista = puntos(state);
        const indice = lista.findIndex((punto) => String(punto.id) === String(id));

        if (indice < 0) {
            return {ok: false, reason: "not_found", referencias: []};
        }

        const referencias = referenciasQueUsanPunto(state, id);
        if (referencias.length > 0 && opciones.force !== true) {
            return {ok: false, reason: "referenced", referencias};
        }

        const [eliminado] = lista.splice(indice, 1);
        const seleccionado = puntoSeleccionado(state);
        if (seleccionado && String(seleccionado.id) === String(id)) {
            limpiarSeleccion(state);
        }

        marcarModificado(state);
        return {ok: true, reason: null, punto: eliminado, referencias};
    }

    function eliminarPuntoSeleccionado(state, opciones = {}) {
        const punto = puntoSeleccionado(state);
        if (!punto) {
            return {ok: false, reason: "no_selection", referencias: []};
        }
        return eliminarPunto(state, punto.id, opciones);
    }

    function eliminarTodosLosPuntos(state) {
        if (!state?.geometry || !Array.isArray(state.geometry.points)) {
            return 0;
        }

        if (lineas(state).length > 0 || polilineas(state).length > 0 || regiones(state).length > 0) {
            return 0;
        }

        const cantidad = state.geometry.points.length;
        state.geometry.points = [];
        limpiarSeleccion(state);

        if (cantidad > 0) {
            marcarModificado(state);
        }

        return cantidad;
    }

    function crearElementoSvg(nombre, atributos = {}) {
        const elemento = document.createElementNS(SVG_NS, nombre);
        Object.entries(atributos).forEach(([clave, valor]) => {
            elemento.setAttribute(clave, String(valor));
        });
        return elemento;
    }

    function puntosPantallaPolilinea(state, polilinea, viewport) {
        if (!polilinea || !Array.isArray(polilinea.pointIds)) {
            return [];
        }

        return polilinea.pointIds
            .map((id) => obtenerPunto(state, id))
            .filter(Boolean)
            .map((punto) => global.GeoFEMViewport.modelToScreen(punto, viewport));
    }

    function atributoPoints(lista = []) {
        return lista.map((punto) => `${punto.x},${punto.y}`).join(" ");
    }

    function renderGeometry(layer, state, viewport) {
        if (!layer || typeof document === "undefined") {
            return;
        }

        layer.replaceChildren();

        // Polilíneas primero: son entidades continuas propias, no colecciones
        // de objetos Line. Sus segmentos se derivan de pointIds al renderizar.
        polilineas(state).forEach((polilinea) => {
            const vertices = puntosPantallaPolilinea(state, polilinea, viewport);
            if (vertices.length < 2) {
                return;
            }

            const visible = crearElementoSvg("polyline", {
                points: atributoPoints(vertices),
                fill: "none",
                stroke: "#2563eb",
                "stroke-width": 3,
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            });
            layer.appendChild(visible);

            const hit = crearElementoSvg("polyline", {
                points: atributoPoints(vertices),
                fill: "none",
                stroke: "transparent",
                "stroke-width": 16,
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
                "vector-effect": "non-scaling-stroke",
                "data-geofem-entity-type": "polyline",
                "data-geofem-entity-id": polilinea.id,
            });
            hit.style.cursor = "pointer";

            const titulo = crearElementoSvg("title");
            const longitud = longitudPolilinea(state, polilinea);
            titulo.textContent =
                `${polilinea.id}: ${polilinea.pointIds.join(" → ")} · ` +
                `${longitud?.toFixed(3) ?? "--"} m`;
            hit.appendChild(titulo);
            layer.appendChild(hit);
        });

        // Las líneas independientes se dibujan después de las polilíneas.
        lineas(state).forEach((linea) => {
            const inicio = obtenerPunto(state, linea.startPointId);
            const fin = obtenerPunto(state, linea.endPointId);
            if (!inicio || !fin) {
                return;
            }

            const a = global.GeoFEMViewport.modelToScreen(inicio, viewport);
            const b = global.GeoFEMViewport.modelToScreen(fin, viewport);

            const visible = crearElementoSvg("line", {
                x1: a.x,
                y1: a.y,
                x2: b.x,
                y2: b.y,
                stroke: "#0f766e",
                "stroke-width": 2.5,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            });
            layer.appendChild(visible);

            const hit = crearElementoSvg("line", {
                x1: a.x,
                y1: a.y,
                x2: b.x,
                y2: b.y,
                stroke: "transparent",
                "stroke-width": 14,
                "vector-effect": "non-scaling-stroke",
                "data-geofem-entity-type": "line",
                "data-geofem-entity-id": linea.id,
            });
            hit.style.cursor = "pointer";

            const titulo = crearElementoSvg("title");
            const longitud = longitudLinea(state, linea);
            titulo.textContent = `${linea.id}: ${inicio.id} → ${fin.id} · ${longitud?.toFixed(3) ?? "--"} m`;
            hit.appendChild(titulo);
            layer.appendChild(hit);
        });

        // Los puntos quedan encima para conservar la edición por vértice.
        puntos(state).forEach((punto) => {
            const pantalla = global.GeoFEMViewport.modelToScreen(punto, viewport);
            const circulo = crearElementoSvg("circle", {
                cx: pantalla.x,
                cy: pantalla.y,
                r: 5,
                fill: "#0f766e",
                stroke: "#ffffff",
                "stroke-width": 2,
                "vector-effect": "non-scaling-stroke",
                "data-geofem-entity-type": "point",
                "data-geofem-entity-id": punto.id,
                tabindex: 0,
            });

            circulo.style.cursor = "pointer";
            const titulo = crearElementoSvg("title");
            titulo.textContent = `${punto.id}: (${punto.x.toFixed(3)}, ${punto.y.toFixed(3)}) m`;
            circulo.appendChild(titulo);
            layer.appendChild(circulo);
        });
    }

    function renderBorradorPolilinea(layer, state, viewport) {
        const ids = Array.isArray(state?.ui?.polylineDraftPointIds)
            ? state.ui.polylineDraftPointIds
            : [];

        if (ids.length === 0) {
            return;
        }

        const puntosModelo = ids.map((id) => obtenerPunto(state, id)).filter(Boolean);
        const vertices = puntosModelo.map((punto) =>
            global.GeoFEMViewport.modelToScreen(punto, viewport)
        );

        if (vertices.length >= 2) {
            layer.appendChild(crearElementoSvg("polyline", {
                points: atributoPoints(vertices),
                fill: "none",
                stroke: "#f59e0b",
                "stroke-width": 3.5,
                "stroke-dasharray": "9 5",
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
        }

        vertices.forEach((vertice, indice) => {
            layer.appendChild(crearElementoSvg("circle", {
                cx: vertice.x,
                cy: vertice.y,
                r: indice === vertices.length - 1 ? 9 : 7,
                fill: "none",
                stroke: "#f59e0b",
                "stroke-width": 2.5,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
        });

        const cursor = state?.ui?.polylineDraftCursorModel;
        const ultimoModelo = puntosModelo[puntosModelo.length - 1];
        if (cursor && ultimoModelo) {
            const a = global.GeoFEMViewport.modelToScreen(ultimoModelo, viewport);
            const b = global.GeoFEMViewport.modelToScreen(cursor, viewport);
            layer.appendChild(crearElementoSvg("line", {
                x1: a.x,
                y1: a.y,
                x2: b.x,
                y2: b.y,
                stroke: "#f59e0b",
                "stroke-width": 2,
                "stroke-dasharray": "6 5",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
        }
    }

    function renderSelection(layer, state, viewport) {
        if (!layer || typeof document === "undefined") {
            return;
        }

        layer.replaceChildren();
        renderBorradorPolilinea(layer, state, viewport);

        const punto = puntoSeleccionado(state);
        if (punto) {
            const pantalla = global.GeoFEMViewport.modelToScreen(punto, viewport);
            layer.appendChild(crearElementoSvg("circle", {
                cx: pantalla.x,
                cy: pantalla.y,
                r: 10,
                fill: "none",
                stroke: "#f59e0b",
                "stroke-width": 2.5,
                "stroke-dasharray": "4 3",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
            layer.appendChild(crearElementoSvg("line", {
                x1: pantalla.x - 14,
                y1: pantalla.y,
                x2: pantalla.x + 14,
                y2: pantalla.y,
                stroke: "#f59e0b",
                "stroke-width": 1,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
            layer.appendChild(crearElementoSvg("line", {
                x1: pantalla.x,
                y1: pantalla.y - 14,
                x2: pantalla.x,
                y2: pantalla.y + 14,
                stroke: "#f59e0b",
                "stroke-width": 1,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
            return;
        }

        const linea = lineaSeleccionada(state);
        if (linea) {
            const inicio = obtenerPunto(state, linea.startPointId);
            const fin = obtenerPunto(state, linea.endPointId);
            if (!inicio || !fin) {
                return;
            }
            const a = global.GeoFEMViewport.modelToScreen(inicio, viewport);
            const b = global.GeoFEMViewport.modelToScreen(fin, viewport);
            layer.appendChild(crearElementoSvg("line", {
                x1: a.x,
                y1: a.y,
                x2: b.x,
                y2: b.y,
                stroke: "#f59e0b",
                "stroke-width": 5,
                "stroke-dasharray": "8 5",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
            return;
        }

        const polilinea = polilineaSeleccionada(state);
        if (polilinea) {
            const vertices = puntosPantallaPolilinea(state, polilinea, viewport);
            if (vertices.length < 2) {
                return;
            }

            layer.appendChild(crearElementoSvg("polyline", {
                points: atributoPoints(vertices),
                fill: "none",
                stroke: "#f59e0b",
                "stroke-width": 6,
                "stroke-dasharray": "10 6",
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));

            vertices.forEach((vertice) => {
                layer.appendChild(crearElementoSvg("circle", {
                    cx: vertice.x,
                    cy: vertice.y,
                    r: 8,
                    fill: "#fff7ed",
                    stroke: "#f59e0b",
                    "stroke-width": 2,
                    "vector-effect": "non-scaling-stroke",
                    "pointer-events": "none",
                }));
            });
        }
    }

    function entidadDesdeTarget(target) {
        if (!target || typeof target.closest !== "function") {
            return null;
        }

        const elemento = target.closest("[data-geofem-entity-type]");
        if (!elemento) {
            return null;
        }

        return {
            type: elemento.getAttribute("data-geofem-entity-type"),
            id: elemento.getAttribute("data-geofem-entity-id"),
        };
    }

    const api = {
        crearPunto,
        actualizarPunto,
        obtenerPunto,
        seleccionarPunto,
        puntoSeleccionado,
        crearLinea,
        obtenerLinea,
        seleccionarLinea,
        lineaSeleccionada,
        longitudLinea,
        existeLineaEntre,
        eliminarLinea,
        eliminarLineaSeleccionada,
        crearPolilinea,
        obtenerPolilinea,
        seleccionarPolilinea,
        polilineaSeleccionada,
        longitudPolilinea,
        existePolilineaEquivalente,
        agregarVerticeBorradorPolilinea,
        actualizarCursorBorradorPolilinea,
        cancelarBorradorPolilinea,
        finalizarBorradorPolilinea,
        eliminarPolilinea,
        eliminarPolilineaSeleccionada,
        limpiarSeleccion,
        lineasQueUsanPunto,
        polilineasQueUsanPunto,
        regionesQueUsanPunto,
        referenciasQueUsanPunto,
        eliminarPunto,
        eliminarPuntoSeleccionado,
        eliminarTodosLosPuntos,
        renderGeometry,
        renderSelection,
        entidadDesdeTarget,
        seleccionActual,
    };

    global.GeoFEMGeometry = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
