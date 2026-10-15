/*
 * GeoFEM - Estratos geotécnicos
 * --------------------------------
 * Sprint 2 / Paso 1
 *
 * Un estrato es una entidad SEMÁNTICA que referencia una región geométrica.
 * La geometría sigue viviendo exclusivamente en geometry.regions.
 *
 * Ejemplo:
 *   R1 = geometría cerrada
 *   E1 = { id: "E1", nombre: "Estrato 1", regionId: "R1", materialId: null }
 *
 * Esta separación evita mezclar coordenadas con propiedades geotécnicas y
 * prepara el modelo para la asignación posterior de materiales y malla FEM.
 */

(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const DEFAULT_COLORS = [
        "#99d8c9",
        "#bcbddc",
        "#fdd0a2",
        "#a6bddb",
        "#c7e9c0",
        "#fdae6b",
        "#9ecae1",
        "#dadaeb",
    ];

    function marcarModificado(state) {
        if (global.GeoFEMState?.marcarModificado) {
            global.GeoFEMState.marcarModificado(state, true);
        } else if (state) {
            state.dirty = true;
        }
    }

    function asegurarContenedor(state) {
        if (!state) {
            throw new Error("projectState no está disponible.");
        }

        if (!state.strata || typeof state.strata !== "object" || Array.isArray(state.strata)) {
            state.strata = {items: [], nextId: 1};
        }
        if (!Array.isArray(state.strata.items)) {
            state.strata.items = [];
        }
        if (!Number.isInteger(Number(state.strata.nextId)) || Number(state.strata.nextId) < 1) {
            state.strata.nextId = calcularSiguienteNumero(state);
        }
        return state.strata;
    }

    function estratos(state) {
        return asegurarContenedor(state).items;
    }

    function calcularSiguienteNumero(state) {
        const items = Array.isArray(state?.strata?.items) ? state.strata.items : [];
        return items.reduce((maximo, estrato) => {
            const match = /^E(\d+)$/.exec(String(estrato?.id || ""));
            return match ? Math.max(maximo, Number(match[1])) : maximo;
        }, 0) + 1;
    }

    function siguienteIdEstrato(state) {
        const contenedor = asegurarContenedor(state);
        let numero = Number(contenedor.nextId);
        if (!Number.isInteger(numero) || numero < 1) {
            numero = calcularSiguienteNumero(state);
        }
        contenedor.nextId = numero + 1;
        return `E${numero}`;
    }

    function obtenerEstrato(state, id) {
        return estratos(state).find(
            (estrato) => String(estrato.id) === String(id)
        ) || null;
    }

    function buscarPorRegion(state, regionId) {
        return estratos(state).find(
            (estrato) => String(estrato.regionId) === String(regionId)
        ) || null;
    }

    function obtenerRegion(state, regionId) {
        if (global.GeoFEMRegions?.obtenerRegion) {
            return global.GeoFEMRegions.obtenerRegion(state, regionId);
        }
        const regiones = Array.isArray(state?.geometry?.regions)
            ? state.geometry.regions
            : [];
        return regiones.find((region) => String(region.id) === String(regionId)) || null;
    }

    function colorParaId(id) {
        const match = /^E(\d+)$/.exec(String(id || ""));
        const numero = match ? Number(match[1]) : 1;
        return DEFAULT_COLORS[(Math.max(numero, 1) - 1) % DEFAULT_COLORS.length];
    }

    function normalizarNombre(nombre, id) {
        const limpio = String(nombre ?? "").trim();
        return limpio || `Estrato ${String(id).replace(/^E/i, "")}`;
    }

    function crearEstratoDesdeRegion(state, regionId, opciones = {}) {
        const region = obtenerRegion(state, regionId);
        if (!region) {
            return {ok: false, reason: "region_not_found", estrato: null};
        }

        const existente = buscarPorRegion(state, region.id);
        if (existente) {
            seleccionarEstrato(state, existente.id);
            return {
                ok: false,
                reason: "region_already_assigned",
                estrato: existente,
            };
        }

        const id = siguienteIdEstrato(state);
        const estrato = {
            id,
            nombre: normalizarNombre(opciones.nombre, id),
            regionId: region.id,
            materialId: null,
            displayColor: opciones.displayColor || colorParaId(id),
            visible: opciones.visible !== false,
        };

        estratos(state).push(estrato);
        seleccionarEstrato(state, estrato.id);
        marcarModificado(state);
        return {ok: true, reason: null, estrato};
    }

    function seleccionarEstrato(state, id) {
        const estrato = obtenerEstrato(state, id);
        if (!state?.ui) return null;

        state.ui.selectedStratumId = estrato ? estrato.id : null;

        // Seleccionamos también su región únicamente como ayuda visual. La
        // selección CAD y la entidad semántica siguen siendo conceptos distintos.
        if (estrato && global.GeoFEMRegions?.seleccionarRegion) {
            global.GeoFEMRegions.seleccionarRegion(state, estrato.regionId);
        }
        return estrato;
    }

    function limpiarSeleccionEstrato(state) {
        if (state?.ui) {
            state.ui.selectedStratumId = null;
        }
    }

    function estratoSeleccionado(state) {
        const id = state?.ui?.selectedStratumId;
        return id ? obtenerEstrato(state, id) : null;
    }

    function actualizarEstrato(state, id, cambios = {}) {
        const estrato = obtenerEstrato(state, id);
        if (!estrato) {
            return {ok: false, reason: "not_found", estrato: null};
        }

        if (Object.prototype.hasOwnProperty.call(cambios, "nombre")) {
            estrato.nombre = normalizarNombre(cambios.nombre, estrato.id);
        }

        if (Object.prototype.hasOwnProperty.call(cambios, "displayColor")) {
            const color = String(cambios.displayColor || "").trim();
            if (/^#[0-9a-fA-F]{6}$/.test(color)) {
                estrato.displayColor = color;
            }
        }

        if (Object.prototype.hasOwnProperty.call(cambios, "visible")) {
            estrato.visible = Boolean(cambios.visible);
        }

        marcarModificado(state);
        return {ok: true, reason: null, estrato};
    }

    function eliminarEstrato(state, id) {
        const items = estratos(state);
        const indice = items.findIndex((estrato) => String(estrato.id) === String(id));
        if (indice < 0) {
            return {ok: false, reason: "not_found", estrato: null};
        }

        const [estrato] = items.splice(indice, 1);
        if (String(state?.ui?.selectedStratumId || "") === String(estrato.id)) {
            limpiarSeleccionEstrato(state);
        }
        marcarModificado(state);
        return {ok: true, reason: null, estrato};
    }

    function eliminarEstratoSeleccionado(state) {
        const estrato = estratoSeleccionado(state);
        return estrato
            ? eliminarEstrato(state, estrato.id)
            : {ok: false, reason: "no_selection", estrato: null};
    }

    function puntosRegion(state, region) {
        const puntos = Array.isArray(state?.geometry?.points)
            ? state.geometry.points
            : [];
        return (region?.pointIds || []).map((id) =>
            puntos.find((punto) => String(punto.id) === String(id)) || null
        ).filter(Boolean);
    }

    function areaEstrato(state, estratoOId) {
        const estrato = typeof estratoOId === "object"
            ? estratoOId
            : obtenerEstrato(state, estratoOId);
        if (!estrato) return null;
        if (global.GeoFEMRegions?.areaRegion) {
            return global.GeoFEMRegions.areaRegion(state, estrato.regionId);
        }
        return null;
    }

    function crearElementoSvg(nombre, atributos = {}) {
        const elemento = document.createElementNS(SVG_NS, nombre);
        Object.entries(atributos).forEach(([clave, valor]) => {
            elemento.setAttribute(clave, String(valor));
        });
        return elemento;
    }

    function atributoPoints(lista = []) {
        return lista.map((p) => `${p.x},${p.y}`).join(" ");
    }

    function centroideSimple(lista = []) {
        if (!lista.length) return null;
        const suma = lista.reduce(
            (acc, p) => ({x: acc.x + p.x, y: acc.y + p.y}),
            {x: 0, y: 0}
        );
        return {x: suma.x / lista.length, y: suma.y / lista.length};
    }

    function renderStrata(layer, state, viewport) {
        if (!layer || typeof document === "undefined") return;
        layer.replaceChildren();

        estratos(state).forEach((estrato) => {
            if (estrato.visible === false) return;
            const region = obtenerRegion(state, estrato.regionId);
            if (!region) return;

            const listaModelo = puntosRegion(state, region);
            if (listaModelo.length < 3) return;
            const listaPantalla = listaModelo.map((punto) =>
                global.GeoFEMViewport.modelToScreen(punto, viewport)
            );

            const polygon = crearElementoSvg("polygon", {
                points: atributoPoints(listaPantalla),
                fill: estrato.displayColor || colorParaId(estrato.id),
                "fill-opacity": 0.34,
                stroke: "none",
                "pointer-events": "none",
            });
            layer.appendChild(polygon);

            const centroModelo = centroideSimple(listaModelo);
            if (!centroModelo) return;
            const centro = global.GeoFEMViewport.modelToScreen(centroModelo, viewport);

            const label = crearElementoSvg("text", {
                x: centro.x,
                y: centro.y,
                "text-anchor": "middle",
                "dominant-baseline": "middle",
                fill: "#0f172a",
                "font-size": 14,
                "font-weight": 800,
                "paint-order": "stroke",
                stroke: "#ffffff",
                "stroke-width": 4,
                "stroke-linejoin": "round",
                "pointer-events": "none",
            });
            label.textContent = `${estrato.id} · ${estrato.nombre}`;
            layer.appendChild(label);
        });
    }

    const api = {
        estratos,
        obtenerEstrato,
        buscarPorRegion,
        crearEstratoDesdeRegion,
        seleccionarEstrato,
        limpiarSeleccionEstrato,
        estratoSeleccionado,
        actualizarEstrato,
        eliminarEstrato,
        eliminarEstratoSeleccionado,
        areaEstrato,
        renderStrata,
    };

    global.GeoFEMStrata = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
