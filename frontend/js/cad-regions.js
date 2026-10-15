/*
 * GeoFEM - Regiones CAD cerradas
 * --------------------------------
 * Sprint 1 / Paso 10
 *
 * Una región es una entidad topológica cerrada formada por una secuencia de
 * IDs de puntos existentes. El primer ID NO se repite al final.
 *
 * Ejemplo:
 *   R1 = { id: "R1", pointIds: ["P1", "P2", "P3", "P4"] }
 *
 * El cierre P4 -> P1 se interpreta de forma implícita. Esto evita duplicar
 * vértices y prepara la geometría para estratos, materiales y mallado.
 */

(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const EPS = 1e-10;

    function marcarModificado(state) {
        if (global.GeoFEMState?.marcarModificado) {
            global.GeoFEMState.marcarModificado(state, true);
        } else if (state) {
            state.dirty = true;
        }
    }

    function regiones(state) {
        return Array.isArray(state?.geometry?.regions)
            ? state.geometry.regions
            : [];
    }

    function puntos(state) {
        return Array.isArray(state?.geometry?.points)
            ? state.geometry.points
            : [];
    }

    function obtenerPunto(state, id) {
        return puntos(state).find((p) => String(p.id) === String(id)) || null;
    }

    function asegurarNextIds(state) {
        if (!state?.geometry) {
            throw new Error("projectState no contiene geometry.");
        }
        if (!state.geometry.nextIds || typeof state.geometry.nextIds !== "object") {
            state.geometry.nextIds = {};
        }
        return state.geometry.nextIds;
    }

    function siguienteIdRegion(state) {
        const nextIds = asegurarNextIds(state);
        let numero = Number(nextIds.region);

        if (!Number.isInteger(numero) || numero < 1) {
            numero = regiones(state).reduce((maximo, region) => {
                const match = /^R(\d+)$/.exec(String(region.id));
                return match ? Math.max(maximo, Number(match[1])) : maximo;
            }, 0) + 1;
        }

        nextIds.region = numero + 1;
        return `R${numero}`;
    }

    function obtenerRegion(state, id) {
        return regiones(state).find(
            (region) => String(region.id) === String(id)
        ) || null;
    }

    function seleccionActual(state) {
        return Array.isArray(state?.ui?.selection)
            ? state.ui.selection[0] || null
            : null;
    }

    function seleccionarRegion(state, id) {
        const region = obtenerRegion(state, id);
        if (!region || !state?.ui) {
            if (state?.ui) state.ui.selection = [];
            return null;
        }
        state.ui.selection = [{type: "region", id: region.id}];
        return region;
    }

    function regionSeleccionada(state) {
        const seleccion = seleccionActual(state);
        if (!seleccion || seleccion.type !== "region") {
            return null;
        }
        return obtenerRegion(state, seleccion.id);
    }

    function asegurarBorradorRegion(state) {
        if (!state?.ui) {
            throw new Error("projectState no contiene ui.");
        }
        if (!Array.isArray(state.ui.regionDraftPointIds)) {
            state.ui.regionDraftPointIds = [];
        }
        return state.ui.regionDraftPointIds;
    }

    function cancelarBorradorRegion(state) {
        if (!state?.ui) return;
        state.ui.regionDraftPointIds = [];
        state.ui.regionDraftCursorModel = null;
    }

    function actualizarCursorBorradorRegion(state, coordenada = null) {
        if (!state?.ui) return;
        if (!coordenada) {
            state.ui.regionDraftCursorModel = null;
            return;
        }
        const x = Number(coordenada.x);
        const y = Number(coordenada.y);
        state.ui.regionDraftCursorModel =
            Number.isFinite(x) && Number.isFinite(y) ? {x, y} : null;
    }

    function agregarVerticeBorradorRegion(state, pointId) {
        const punto = obtenerPunto(state, pointId);
        if (!punto) {
            return {ok: false, reason: "point_not_found", closeRequested: false, pointIds: []};
        }

        const ids = asegurarBorradorRegion(state);
        const ultimo = ids[ids.length - 1];
        const primero = ids[0];

        if (ultimo !== undefined && String(ultimo) === String(punto.id)) {
            return {ok: false, reason: "same_consecutive_point", closeRequested: false, pointIds: [...ids]};
        }

        // Volver al primer vértice solicita el cierre, pero NO duplica el ID.
        if (primero !== undefined && String(primero) === String(punto.id)) {
            if (ids.length < 3) {
                return {ok: false, reason: "insufficient_to_close", closeRequested: false, pointIds: [...ids]};
            }
            return {ok: true, reason: null, closeRequested: true, pointIds: [...ids]};
        }

        if (ids.some((id) => String(id) === String(punto.id))) {
            return {ok: false, reason: "duplicate_vertex", closeRequested: false, pointIds: [...ids]};
        }

        ids.push(punto.id);
        return {ok: true, reason: null, closeRequested: false, pointIds: [...ids]};
    }

    function puntosRegion(state, regionOIds) {
        const ids = Array.isArray(regionOIds)
            ? regionOIds
            : regionOIds?.pointIds;
        if (!Array.isArray(ids)) return [];
        return ids.map((id) => obtenerPunto(state, id)).filter(Boolean);
    }

    function areaFirmadaDesdePuntos(lista) {
        if (!Array.isArray(lista) || lista.length < 3) return 0;
        let suma = 0;
        for (let i = 0; i < lista.length; i += 1) {
            const a = lista[i];
            const b = lista[(i + 1) % lista.length];
            suma += a.x * b.y - b.x * a.y;
        }
        return suma / 2;
    }

    function areaRegion(state, regionOId) {
        const region = typeof regionOId === "object"
            ? regionOId
            : obtenerRegion(state, regionOId);
        if (!region) return null;
        const lista = puntosRegion(state, region);
        if (lista.length !== region.pointIds.length) return null;
        return Math.abs(areaFirmadaDesdePuntos(lista));
    }

    function perimetroRegion(state, regionOId) {
        const region = typeof regionOId === "object"
            ? regionOId
            : obtenerRegion(state, regionOId);
        if (!region) return null;
        const lista = puntosRegion(state, region);
        if (lista.length !== region.pointIds.length || lista.length < 3) return null;
        let total = 0;
        for (let i = 0; i < lista.length; i += 1) {
            const a = lista[i];
            const b = lista[(i + 1) % lista.length];
            total += Math.hypot(b.x - a.x, b.y - a.y);
        }
        return total;
    }

    function orientacionRegion(state, regionOId) {
        const region = typeof regionOId === "object"
            ? regionOId
            : obtenerRegion(state, regionOId);
        if (!region) return null;
        const lista = puntosRegion(state, region);
        if (lista.length !== region.pointIds.length || lista.length < 3) return null;
        const areaFirmada = areaFirmadaDesdePuntos(lista);
        if (Math.abs(areaFirmada) <= EPS) return "degenerada";
        return areaFirmada > 0 ? "antihorario" : "horario";
    }

    function puntoConOverride(state, id, overrides = {}) {
        const base = obtenerPunto(state, id);
        if (!base) return null;
        const override = overrides[String(id)] || overrides[id];
        if (!override) return base;
        const x = Number(override.x);
        const y = Number(override.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return {...base, x, y};
    }

    function listaPuntosConOverride(state, pointIds = [], overrides = {}) {
        return pointIds.map((id) => puntoConOverride(state, id, overrides));
    }

    function tienePosicionesDuplicadas(lista = []) {
        for (let i = 0; i < lista.length; i += 1) {
            for (let j = i + 1; j < lista.length; j += 1) {
                if (
                    Math.abs(lista[i].x - lista[j].x) <= EPS &&
                    Math.abs(lista[i].y - lista[j].y) <= EPS
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    function orientacion(a, b, c) {
        const valor = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if (Math.abs(valor) <= EPS) return 0;
        return valor > 0 ? 1 : -1;
    }

    function sobreSegmento(a, b, p) {
        return (
            Math.min(a.x, b.x) - EPS <= p.x && p.x <= Math.max(a.x, b.x) + EPS &&
            Math.min(a.y, b.y) - EPS <= p.y && p.y <= Math.max(a.y, b.y) + EPS
        );
    }

    function segmentosIntersectan(a, b, c, d) {
        const o1 = orientacion(a, b, c);
        const o2 = orientacion(a, b, d);
        const o3 = orientacion(c, d, a);
        const o4 = orientacion(c, d, b);

        if (o1 !== o2 && o3 !== o4) return true;
        if (o1 === 0 && sobreSegmento(a, b, c)) return true;
        if (o2 === 0 && sobreSegmento(a, b, d)) return true;
        if (o3 === 0 && sobreSegmento(c, d, a)) return true;
        if (o4 === 0 && sobreSegmento(c, d, b)) return true;
        return false;
    }

    function tieneAutointerseccionesLista(lista = []) {
        if (lista.some((p) => !p) || lista.length < 4) return false;
        const n = lista.length;

        for (let i = 0; i < n; i += 1) {
            const a = lista[i];
            const b = lista[(i + 1) % n];
            for (let j = i + 1; j < n; j += 1) {
                const c = lista[j];
                const d = lista[(j + 1) % n];

                const adyacentes =
                    i === j ||
                    (i + 1) % n === j ||
                    (j + 1) % n === i;
                if (adyacentes) continue;

                if (segmentosIntersectan(a, b, c, d)) return true;
            }
        }
        return false;
    }

    function tieneAutointersecciones(state, pointIds = []) {
        const lista = pointIds.map((id) => obtenerPunto(state, id));
        return tieneAutointerseccionesLista(lista);
    }

    function validarContorno(state, pointIds = [], overrides = {}) {
        const ids = Array.isArray(pointIds) ? [...pointIds] : [];
        if (ids.length < 3) {
            return {ok: false, reason: "insufficient_vertices"};
        }
        if (new Set(ids.map(String)).size !== ids.length) {
            return {ok: false, reason: "duplicate_vertex"};
        }

        const lista = listaPuntosConOverride(state, ids, overrides);
        if (lista.some((p) => !p)) {
            return {ok: false, reason: "point_not_found"};
        }
        if (tienePosicionesDuplicadas(lista)) {
            return {ok: false, reason: "duplicate_position"};
        }
        if (tieneAutointerseccionesLista(lista)) {
            return {ok: false, reason: "self_intersection"};
        }
        const area = Math.abs(areaFirmadaDesdePuntos(lista));
        if (!(area > EPS)) {
            return {ok: false, reason: "zero_area"};
        }
        return {ok: true, reason: null, area};
    }

    function validarMovimientoPunto(state, pointId, coordenada = {}) {
        const x = Number(coordenada.x);
        const y = Number(coordenada.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return {ok: false, reason: "invalid_coordinate", regionIds: []};
        }

        const afectadas = regiones(state).filter((region) =>
            Array.isArray(region.pointIds) &&
            region.pointIds.some((id) => String(id) === String(pointId))
        );

        for (const region of afectadas) {
            const validacion = validarContorno(
                state,
                region.pointIds,
                {[String(pointId)]: {x, y}}
            );
            if (!validacion.ok) {
                return {
                    ok: false,
                    reason: validacion.reason,
                    regionId: region.id,
                    regionIds: afectadas.map((item) => item.id),
                };
            }
        }

        return {
            ok: true,
            reason: null,
            regionIds: afectadas.map((item) => item.id),
        };
    }

    function secuenciaCerradaEquivalente(a = [], b = []) {
        if (a.length !== b.length || a.length === 0) return false;
        const aa = a.map(String);
        const bb = b.map(String);
        const n = aa.length;

        function coincide(listaB) {
            for (let offset = 0; offset < n; offset += 1) {
                let ok = true;
                for (let i = 0; i < n; i += 1) {
                    if (aa[i] !== listaB[(i + offset) % n]) {
                        ok = false;
                        break;
                    }
                }
                if (ok) return true;
            }
            return false;
        }

        return coincide(bb) || coincide([...bb].reverse());
    }

    function existeRegionEquivalente(state, pointIds = []) {
        return regiones(state).some((region) =>
            Array.isArray(region.pointIds) &&
            secuenciaCerradaEquivalente(region.pointIds, pointIds)
        );
    }

    function crearRegion(state, pointIds = []) {
        const ids = Array.isArray(pointIds) ? [...pointIds] : [];
        if (ids.length < 3) {
            return {ok: false, reason: "insufficient_vertices", region: null};
        }
        if (new Set(ids.map(String)).size !== ids.length) {
            return {ok: false, reason: "duplicate_vertex", region: null};
        }
        const validacion = validarContorno(state, ids);
        if (!validacion.ok) {
            return {ok: false, reason: validacion.reason, region: null};
        }
        if (existeRegionEquivalente(state, ids)) {
            return {ok: false, reason: "duplicate", region: null};
        }

        const region = {
            id: siguienteIdRegion(state),
            pointIds: ids,
            closed: true,
        };
        state.geometry.regions.push(region);
        cancelarBorradorRegion(state);
        seleccionarRegion(state, region.id);
        marcarModificado(state);
        return {ok: true, reason: null, region};
    }

    function finalizarBorradorRegion(state) {
        return crearRegion(state, asegurarBorradorRegion(state));
    }

    function eliminarRegion(state, id) {
        const lista = regiones(state);
        const indice = lista.findIndex((r) => String(r.id) === String(id));
        if (indice < 0) {
            return {ok: false, reason: "not_found", region: null};
        }

        // Una región con significado geotécnico no puede desaparecer dejando
        // un estrato apuntando a un contorno inexistente. La capa de Estratos
        // se carga después de este archivo, pero en tiempo de ejecución ya está
        // disponible cuando el usuario intenta eliminar la región.
        const estrato = global.GeoFEMStrata?.buscarPorRegion
            ? global.GeoFEMStrata.buscarPorRegion(state, id)
            : null;
        if (estrato) {
            return {
                ok: false,
                reason: "region_in_use_by_stratum",
                region: lista[indice],
                stratum: estrato,
            };
        }

        const [eliminada] = lista.splice(indice, 1);
        const seleccion = seleccionActual(state);
        if (seleccion?.type === "region" && String(seleccion.id) === String(id)) {
            state.ui.selection = [];
        }
        marcarModificado(state);
        return {ok: true, reason: null, region: eliminada};
    }

    function eliminarRegionSeleccionada(state) {
        const region = regionSeleccionada(state);
        if (!region) return {ok: false, reason: "no_selection", region: null};
        return eliminarRegion(state, region.id);
    }

    function regionObjetivoEdicion(state) {
        const id = state?.ui?.regionEditTargetId;
        return id ? obtenerRegion(state, id) : regionSeleccionada(state);
    }

    function iniciarEdicionRegion(state, regionId) {
        const region = obtenerRegion(state, regionId);
        if (!region || !state?.ui) {
            return {ok: false, reason: "not_found", region: null};
        }
        state.ui.regionEditTargetId = region.id;
        seleccionarRegion(state, region.id);
        return {ok: true, reason: null, region};
    }

    function cancelarEdicionRegion(state) {
        if (state?.ui) state.ui.regionEditTargetId = null;
    }

    function quitarVerticeRegion(state, regionId, pointId) {
        const region = obtenerRegion(state, regionId);
        if (!region) return {ok: false, reason: "not_found", region: null};
        if (!region.pointIds.some((id) => String(id) === String(pointId))) {
            return {ok: false, reason: "point_not_in_region", region};
        }
        if (region.pointIds.length <= 3) {
            return {ok: false, reason: "minimum_vertices", region};
        }

        const nuevosIds = region.pointIds.filter(
            (id) => String(id) !== String(pointId)
        );
        const validacion = validarContorno(state, nuevosIds);
        if (!validacion.ok) {
            return {ok: false, reason: validacion.reason, region};
        }

        region.pointIds = nuevosIds;
        seleccionarRegion(state, region.id);
        cancelarEdicionRegion(state);
        marcarModificado(state);
        return {
            ok: true,
            reason: null,
            region,
            pointId,
            pointKept: true,
        };
    }

    function invertirRegion(state, regionId) {
        const region = obtenerRegion(state, regionId);
        if (!region) return {ok: false, reason: "not_found", region: null};
        region.pointIds = [...region.pointIds].reverse();
        seleccionarRegion(state, region.id);
        marcarModificado(state);
        return {ok: true, reason: null, region};
    }

    function proyeccionSegmento(a, b, p) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const longitud2 = dx * dx + dy * dy;
        if (longitud2 <= EPS) {
            return {x: a.x, y: a.y, t: 0, distance: Math.hypot(p.x - a.x, p.y - a.y)};
        }
        const tLibre = ((p.x - a.x) * dx + (p.y - a.y) * dy) / longitud2;
        const t = Math.max(0, Math.min(1, tLibre));
        const x = a.x + t * dx;
        const y = a.y + t * dy;
        return {x, y, t, distance: Math.hypot(p.x - x, p.y - y)};
    }

    function bordeMasCercano(state, regionOId, viewport, svgPoint, tolerancePx = 14) {
        const region = typeof regionOId === "object"
            ? regionOId
            : obtenerRegion(state, regionOId);
        if (!region || !svgPoint || !global.GeoFEMViewport) return null;
        const verticesModelo = puntosRegion(state, region);
        if (verticesModelo.length !== region.pointIds.length) return null;

        let mejor = null;
        for (let i = 0; i < verticesModelo.length; i += 1) {
            const aModelo = verticesModelo[i];
            const bModelo = verticesModelo[(i + 1) % verticesModelo.length];
            const a = global.GeoFEMViewport.modelToScreen(aModelo, viewport);
            const b = global.GeoFEMViewport.modelToScreen(bModelo, viewport);
            const proy = proyeccionSegmento(a, b, svgPoint);
            if (!mejor || proy.distance < mejor.distancePx) {
                mejor = {
                    edgeIndex: i,
                    startPointId: region.pointIds[i],
                    endPointId: region.pointIds[(i + 1) % region.pointIds.length],
                    t: proy.t,
                    distancePx: proy.distance,
                    model: {
                        x: aModelo.x + proy.t * (bModelo.x - aModelo.x),
                        y: aModelo.y + proy.t * (bModelo.y - aModelo.y),
                    },
                };
            }
        }

        return mejor && mejor.distancePx <= Number(tolerancePx) ? mejor : null;
    }

    function puntoCoincidente(state, coordenada, excludeIds = []) {
        const excluidos = new Set(excludeIds.map(String));
        return puntos(state).find((punto) =>
            !excluidos.has(String(punto.id)) &&
            Math.abs(punto.x - coordenada.x) <= EPS &&
            Math.abs(punto.y - coordenada.y) <= EPS
        ) || null;
    }

    function insertarVerticeEnBorde(
        state,
        regionId,
        viewport,
        svgPoint,
        tolerancePx = 14
    ) {
        const region = obtenerRegion(state, regionId);
        if (!region) return {ok: false, reason: "not_found", region: null};

        const borde = bordeMasCercano(
            state,
            region,
            viewport,
            svgPoint,
            tolerancePx
        );
        if (!borde) return {ok: false, reason: "edge_not_found", region};

        // Evitamos insertar prácticamente encima de un extremo: no aporta un
        // vértice nuevo y puede crear segmentos numéricamente degenerados.
        if (borde.t <= 0.02 || borde.t >= 0.98) {
            return {ok: false, reason: "near_endpoint", region, borde};
        }

        let punto = puntoCoincidente(
            state,
            borde.model,
            [borde.startPointId, borde.endPointId]
        );
        let creado = false;

        if (!punto) {
            if (!global.GeoFEMGeometry?.crearPunto) {
                return {ok: false, reason: "geometry_api_missing", region};
            }
            punto = global.GeoFEMGeometry.crearPunto(state, borde.model);
            creado = true;
        }

        if (region.pointIds.some((id) => String(id) === String(punto.id))) {
            return {ok: false, reason: "duplicate_vertex", region, borde};
        }

        const nuevosIds = [...region.pointIds];
        nuevosIds.splice(borde.edgeIndex + 1, 0, punto.id);
        const validacion = validarContorno(state, nuevosIds);
        if (!validacion.ok) {
            if (creado && global.GeoFEMGeometry?.eliminarPunto) {
                global.GeoFEMGeometry.eliminarPunto(state, punto.id, {force: true});
            }
            seleccionarRegion(state, region.id);
            return {ok: false, reason: validacion.reason, region, borde};
        }

        region.pointIds = nuevosIds;
        seleccionarRegion(state, region.id);
        cancelarEdicionRegion(state);
        marcarModificado(state);
        return {ok: true, reason: null, region, punto, borde, createdPoint: creado};
    }

    function crearElementoSvg(nombre, atributos = {}) {
        const elemento = document.createElementNS(SVG_NS, nombre);
        Object.entries(atributos).forEach(([clave, valor]) => {
            elemento.setAttribute(clave, String(valor));
        });
        return elemento;
    }

    function puntosPantalla(state, region, viewport) {
        return puntosRegion(state, region).map((p) =>
            global.GeoFEMViewport.modelToScreen(p, viewport)
        );
    }

    function atributoPoints(lista = []) {
        return lista.map((p) => `${p.x},${p.y}`).join(" ");
    }

    function renderRegions(layer, state, viewport) {
        if (!layer || typeof document === "undefined") return;
        layer.replaceChildren();

        regiones(state).forEach((region) => {
            const vertices = puntosPantalla(state, region, viewport);
            if (vertices.length < 3) return;

            const visible = crearElementoSvg("polygon", {
                points: atributoPoints(vertices),
                fill: "#14b8a6",
                "fill-opacity": 0.13,
                stroke: "#0f766e",
                "stroke-width": 2.5,
                "stroke-linejoin": "round",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            });
            layer.appendChild(visible);

            const hit = crearElementoSvg("polygon", {
                points: atributoPoints(vertices),
                fill: "transparent",
                stroke: "transparent",
                "stroke-width": 12,
                "vector-effect": "non-scaling-stroke",
                "data-geofem-entity-type": "region",
                "data-geofem-entity-id": region.id,
            });
            hit.style.cursor = "pointer";
            const titulo = crearElementoSvg("title");
            titulo.textContent =
                `${region.id}: ${region.pointIds.join(" → ")} → ${region.pointIds[0]} · ` +
                `Área ${areaRegion(state, region)?.toFixed(3) ?? "--"} m²`;
            hit.appendChild(titulo);
            layer.appendChild(hit);
        });
    }

    function renderOverlay(layer, state, viewport) {
        if (!layer || typeof document === "undefined") return;
        layer.replaceChildren();

        const ids = Array.isArray(state?.ui?.regionDraftPointIds)
            ? state.ui.regionDraftPointIds
            : [];
        const listaModelo = ids.map((id) => obtenerPunto(state, id)).filter(Boolean);
        const vertices = listaModelo.map((p) =>
            global.GeoFEMViewport.modelToScreen(p, viewport)
        );

        if (vertices.length >= 2) {
            layer.appendChild(crearElementoSvg("polyline", {
                points: atributoPoints(vertices),
                fill: vertices.length >= 3 ? "#f59e0b" : "none",
                "fill-opacity": vertices.length >= 3 ? 0.07 : 0,
                stroke: "#f59e0b",
                "stroke-width": 3.5,
                "stroke-dasharray": "9 5",
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
        }

        vertices.forEach((p, indice) => {
            layer.appendChild(crearElementoSvg("circle", {
                cx: p.x,
                cy: p.y,
                r: indice === 0 ? 10 : 7,
                fill: "none",
                stroke: "#f59e0b",
                "stroke-width": indice === 0 ? 3 : 2,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
        });

        const cursor = state?.ui?.regionDraftCursorModel;
        const ultimo = listaModelo[listaModelo.length - 1];
        if (cursor && ultimo) {
            const a = global.GeoFEMViewport.modelToScreen(ultimo, viewport);
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

        const seleccionada = regionSeleccionada(state);
        if (!seleccionada) return;
        const seleccionVertices = puntosPantalla(state, seleccionada, viewport);
        if (seleccionVertices.length < 3) return;

        layer.appendChild(crearElementoSvg("polygon", {
            points: atributoPoints(seleccionVertices),
            fill: "#f59e0b",
            "fill-opacity": 0.10,
            stroke: "#f59e0b",
            "stroke-width": 5,
            "stroke-dasharray": "10 6",
            "stroke-linejoin": "round",
            "vector-effect": "non-scaling-stroke",
            "pointer-events": "none",
        }));
        seleccionVertices.forEach((p) => {
            layer.appendChild(crearElementoSvg("circle", {
                cx: p.x,
                cy: p.y,
                r: 8,
                fill: "#fff7ed",
                stroke: "#f59e0b",
                "stroke-width": 2,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
        });
    }

    const api = {
        regiones,
        obtenerRegion,
        seleccionarRegion,
        regionSeleccionada,
        agregarVerticeBorradorRegion,
        actualizarCursorBorradorRegion,
        cancelarBorradorRegion,
        crearRegion,
        finalizarBorradorRegion,
        existeRegionEquivalente,
        tieneAutointersecciones,
        areaRegion,
        perimetroRegion,
        orientacionRegion,
        validarContorno,
        validarMovimientoPunto,
        bordeMasCercano,
        iniciarEdicionRegion,
        cancelarEdicionRegion,
        regionObjetivoEdicion,
        insertarVerticeEnBorde,
        quitarVerticeRegion,
        invertirRegion,
        eliminarRegion,
        eliminarRegionSeleccionada,
        renderRegions,
        renderOverlay,
    };

    global.GeoFEMRegions = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
