/*
 * GeoFEM - Geometría CAD básica
 * -----------------------------
 * Sprint 1 / Paso 5
 *
 * Responsabilidades actuales:
 *   - crear puntos reales en projectState.geometry.points;
 *   - seleccionar / deseleccionar puntos;
 *   - editar coordenadas X/Y de un punto existente;
 *   - eliminar un punto de forma individual;
 *   - dibujar puntos en geometryLayer;
 *   - dibujar el resaltado de selección en selectionLayer.
 *
 * Importante:
 * El SVG NO es la fuente de verdad. Cada círculo se vuelve a generar desde
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

    function siguienteIdPunto(state) {
        const geometry = state?.geometry;
        if (!geometry) {
            throw new Error("projectState no contiene geometry.");
        }

        if (!geometry.nextIds || typeof geometry.nextIds !== "object") {
            geometry.nextIds = {};
        }

        let numero = Number(geometry.nextIds.point);

        // Compatibilidad con estados antiguos que todavía no tienen contador.
        if (!Number.isInteger(numero) || numero < 1) {
            numero = puntos(state).reduce((maximo, punto) => {
                const match = /^P(\d+)$/.exec(String(punto.id));
                return match ? Math.max(maximo, Number(match[1])) : maximo;
            }, 0) + 1;
        }

        geometry.nextIds.point = numero + 1;
        return `P${numero}`;
    }

    function obtenerPunto(state, id) {
        return puntos(state).find((punto) => String(punto.id) === String(id)) || null;
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

    function puntoSeleccionado(state) {
        const seleccion = Array.isArray(state?.ui?.selection)
            ? state.ui.selection[0]
            : null;

        if (!seleccion || seleccion.type !== "point") {
            return null;
        }

        return obtenerPunto(state, seleccion.id);
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
        const lineas = Array.isArray(state?.geometry?.lines)
            ? state.geometry.lines
            : [];

        return lineas.filter((linea) => {
            const inicio = linea.startPointId ?? linea.puntoInicialId ?? null;
            const fin = linea.endPointId ?? linea.puntoFinalId ?? null;
            return String(inicio) === String(id) || String(fin) === String(id);
        });
    }

    function eliminarPunto(state, id, opciones = {}) {
        const lista = puntos(state);
        const indice = lista.findIndex(
            (punto) => String(punto.id) === String(id)
        );

        if (indice < 0) {
            return {ok: false, reason: "not_found", referencias: []};
        }

        const referencias = lineasQueUsanPunto(state, id);
        if (referencias.length > 0 && opciones.force !== true) {
            return {
                ok: false,
                reason: "referenced",
                referencias,
            };
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

    function renderGeometry(layer, state, viewport) {
        if (!layer || typeof document === "undefined") {
            return;
        }

        layer.replaceChildren();

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

    function renderSelection(layer, state, viewport) {
        if (!layer || typeof document === "undefined") {
            return;
        }

        layer.replaceChildren();

        const punto = puntoSeleccionado(state);
        if (!punto) {
            return;
        }

        const pantalla = global.GeoFEMViewport.modelToScreen(punto, viewport);

        layer.appendChild(
            crearElementoSvg("circle", {
                cx: pantalla.x,
                cy: pantalla.y,
                r: 10,
                fill: "none",
                stroke: "#f59e0b",
                "stroke-width": 2.5,
                "stroke-dasharray": "4 3",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            })
        );

        layer.appendChild(
            crearElementoSvg("line", {
                x1: pantalla.x - 14,
                y1: pantalla.y,
                x2: pantalla.x + 14,
                y2: pantalla.y,
                stroke: "#f59e0b",
                "stroke-width": 1,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            })
        );

        layer.appendChild(
            crearElementoSvg("line", {
                x1: pantalla.x,
                y1: pantalla.y - 14,
                x2: pantalla.x,
                y2: pantalla.y + 14,
                stroke: "#f59e0b",
                "stroke-width": 1,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            })
        );
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
        limpiarSeleccion,
        lineasQueUsanPunto,
        eliminarPunto,
        eliminarPuntoSeleccionado,
        eliminarTodosLosPuntos,
        renderGeometry,
        renderSelection,
        entidadDesdeTarget,
    };

    global.GeoFEMGeometry = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
