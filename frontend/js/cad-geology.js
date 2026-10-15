/*
 * GeoFEM - Modelo geológico: dominio e interfaces estratigráficas
 * ----------------------------------------------------------------
 * Sprint 2 / Paso 2
 *
 * Este módulo añade significado geológico a entidades CAD existentes sin
 * duplicar sus coordenadas:
 *
 *   D1 -> referencia una Region (dominio exterior del modelo)
 *   I1 -> referencia una Polyline (interfaz entre unidades/estratos)
 *
 * El dominio y las interfaces NO son todavía estratos FEM. En el siguiente
 * paso se utilizarán para particionar el dominio en regiones estratigráficas.
 */

(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";
    const EPS = 1e-8;

    function marcarModificado(state) {
        if (global.GeoFEMState?.marcarModificado) {
            global.GeoFEMState.marcarModificado(state, true);
        } else if (state) {
            state.dirty = true;
        }
    }

    function asegurarContenedor(state) {
        if (!state) throw new Error("projectState no está disponible.");

        if (!state.geology || typeof state.geology !== "object" || Array.isArray(state.geology)) {
            state.geology = {
                domain: null,
                interfaces: {items: [], nextId: 1},
            };
        }

        if (!state.geology.interfaces || typeof state.geology.interfaces !== "object") {
            state.geology.interfaces = {items: [], nextId: 1};
        }
        if (!Array.isArray(state.geology.interfaces.items)) {
            state.geology.interfaces.items = [];
        }
        if (!Number.isInteger(Number(state.geology.interfaces.nextId)) || Number(state.geology.interfaces.nextId) < 1) {
            state.geology.interfaces.nextId = calcularSiguienteNumeroInterfaz(state);
        }

        return state.geology;
    }

    function dominio(state) {
        return asegurarContenedor(state).domain || null;
    }

    function interfaces(state) {
        return asegurarContenedor(state).interfaces.items;
    }

    function calcularSiguienteNumeroInterfaz(state) {
        return interfacesSinAsegurar(state).reduce((maximo, interfaz) => {
            const match = /^I(\d+)$/.exec(String(interfaz?.id || ""));
            return match ? Math.max(maximo, Number(match[1])) : maximo;
        }, 0) + 1;
    }

    function interfacesSinAsegurar(state) {
        return Array.isArray(state?.geology?.interfaces?.items)
            ? state.geology.interfaces.items
            : [];
    }

    function siguienteIdInterfaz(state) {
        const contenedor = asegurarContenedor(state).interfaces;
        let numero = Number(contenedor.nextId);
        if (!Number.isInteger(numero) || numero < 1) {
            numero = calcularSiguienteNumeroInterfaz(state);
        }
        contenedor.nextId = numero + 1;
        return `I${numero}`;
    }

    function obtenerInterfaz(state, id) {
        return interfaces(state).find(
            (interfaz) => String(interfaz.id) === String(id)
        ) || null;
    }

    function buscarPorPolilinea(state, polylineId) {
        return interfaces(state).find(
            (interfaz) => String(interfaz.polylineId) === String(polylineId)
        ) || null;
    }

    function interfazSeleccionada(state) {
        const id = state?.ui?.selectedGeologyInterfaceId;
        return id ? obtenerInterfaz(state, id) : null;
    }

    function seleccionarInterfaz(state, id) {
        const interfaz = obtenerInterfaz(state, id);
        if (!state?.ui) return null;
        state.ui.selectedGeologyInterfaceId = interfaz ? interfaz.id : null;
        if (interfaz && global.GeoFEMGeometry?.seleccionarPolilinea) {
            global.GeoFEMGeometry.seleccionarPolilinea(state, interfaz.polylineId);
        }
        return interfaz;
    }

    function limpiarSeleccionInterfaz(state) {
        if (state?.ui) state.ui.selectedGeologyInterfaceId = null;
    }

    function obtenerRegion(state, regionId) {
        if (global.GeoFEMRegions?.obtenerRegion) {
            return global.GeoFEMRegions.obtenerRegion(state, regionId);
        }
        return (state?.geometry?.regions || []).find(
            (region) => String(region.id) === String(regionId)
        ) || null;
    }

    function obtenerPolilinea(state, polylineId) {
        if (global.GeoFEMGeometry?.obtenerPolilinea) {
            return global.GeoFEMGeometry.obtenerPolilinea(state, polylineId);
        }
        return (state?.geometry?.polylines || []).find(
            (polilinea) => String(polilinea.id) === String(polylineId)
        ) || null;
    }

    function obtenerPunto(state, pointId, overrides = null) {
        const override = overrides && overrides[String(pointId)];
        if (override) {
            return {
                id: pointId,
                x: Number(override.x),
                y: Number(override.y),
            };
        }
        if (global.GeoFEMGeometry?.obtenerPunto) {
            return global.GeoFEMGeometry.obtenerPunto(state, pointId);
        }
        return (state?.geometry?.points || []).find(
            (punto) => String(punto.id) === String(pointId)
        ) || null;
    }

    function puntosRegion(state, region, overrides = null) {
        return (region?.pointIds || [])
            .map((id) => obtenerPunto(state, id, overrides))
            .filter(Boolean);
    }

    function puntosPolilinea(state, polilinea, overrides = null) {
        return (polilinea?.pointIds || [])
            .map((id) => obtenerPunto(state, id, overrides))
            .filter(Boolean);
    }

    function casiIgual(a, b, eps = EPS) {
        return Math.abs(Number(a) - Number(b)) <= eps;
    }

    function mismoPunto(a, b, eps = EPS) {
        return Boolean(a && b) && casiIgual(a.x, b.x, eps) && casiIgual(a.y, b.y, eps);
    }

    function productoCruz(a, b, c) {
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    }

    function puntoEnSegmento(p, a, b, eps = EPS) {
        if (Math.abs(productoCruz(a, b, p)) > eps) return false;
        return (
            p.x >= Math.min(a.x, b.x) - eps &&
            p.x <= Math.max(a.x, b.x) + eps &&
            p.y >= Math.min(a.y, b.y) - eps &&
            p.y <= Math.max(a.y, b.y) + eps
        );
    }

    function signo(valor, eps = EPS) {
        if (valor > eps) return 1;
        if (valor < -eps) return -1;
        return 0;
    }

    function relacionSegmentos(a, b, c, d) {
        const o1 = signo(productoCruz(a, b, c));
        const o2 = signo(productoCruz(a, b, d));
        const o3 = signo(productoCruz(c, d, a));
        const o4 = signo(productoCruz(c, d, b));

        if (o1 * o2 < 0 && o3 * o4 < 0) return "cross";

        const contactos = [];
        if (o1 === 0 && puntoEnSegmento(c, a, b)) contactos.push(c);
        if (o2 === 0 && puntoEnSegmento(d, a, b)) contactos.push(d);
        if (o3 === 0 && puntoEnSegmento(a, c, d)) contactos.push(a);
        if (o4 === 0 && puntoEnSegmento(b, c, d)) contactos.push(b);

        if (!contactos.length) return "none";

        // Si los cuatro puntos son colineales, diferenciamos contacto puntual
        // de solapamiento con longitud positiva.
        if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) {
            const usarX = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
            const valoresAB = usarX ? [a.x, b.x] : [a.y, b.y];
            const valoresCD = usarX ? [c.x, d.x] : [c.y, d.y];
            const inicio = Math.max(Math.min(...valoresAB), Math.min(...valoresCD));
            const fin = Math.min(Math.max(...valoresAB), Math.max(...valoresCD));
            if (fin - inicio > EPS) return "overlap";
        }

        return "touch";
    }

    function puntoEnBordePoligono(p, poligono) {
        for (let i = 0; i < poligono.length; i += 1) {
            const a = poligono[i];
            const b = poligono[(i + 1) % poligono.length];
            if (puntoEnSegmento(p, a, b)) return true;
        }
        return false;
    }

    function puntoEnPoligono(p, poligono, incluirBorde = true) {
        if (!Array.isArray(poligono) || poligono.length < 3) return false;
        if (puntoEnBordePoligono(p, poligono)) return Boolean(incluirBorde);

        let dentro = false;
        for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
            const pi = poligono[i];
            const pj = poligono[j];
            const cruza = ((pi.y > p.y) !== (pj.y > p.y)) &&
                (p.x < ((pj.x - pi.x) * (p.y - pi.y)) / (pj.y - pi.y) + pi.x);
            if (cruza) dentro = !dentro;
        }
        return dentro;
    }

    function segmentosDeIds(state, pointIds, overrides = null, closed = false) {
        const segmentos = [];
        const limite = closed ? pointIds.length : pointIds.length - 1;
        for (let i = 0; i < limite; i += 1) {
            const aId = pointIds[i];
            const bId = pointIds[(i + 1) % pointIds.length];
            const a = obtenerPunto(state, aId, overrides);
            const b = obtenerPunto(state, bId, overrides);
            if (!a || !b) return null;
            segmentos.push({aId, bId, a, b, index: i});
        }
        return segmentos;
    }

    function tieneAutointerseccionPolilinea(state, polilinea, overrides = null) {
        const segmentos = segmentosDeIds(state, polilinea.pointIds, overrides, false);
        if (!segmentos) return true;
        for (let i = 0; i < segmentos.length; i += 1) {
            for (let j = i + 1; j < segmentos.length; j += 1) {
                if (j === i + 1) continue;
                const relacion = relacionSegmentos(
                    segmentos[i].a,
                    segmentos[i].b,
                    segmentos[j].a,
                    segmentos[j].b
                );
                if (relacion !== "none") return true;
            }
        }
        return false;
    }

    function validarInterfaz(state, polylineId, opciones = {}) {
        const geology = asegurarContenedor(state);
        const domain = geology.domain;
        if (!domain) return {ok: false, reason: "no_domain"};

        const region = obtenerRegion(state, domain.regionId);
        if (!region) return {ok: false, reason: "domain_region_missing"};

        const polilinea = obtenerPolilinea(state, polylineId);
        if (!polilinea) return {ok: false, reason: "polyline_not_found"};
        if (!Array.isArray(polilinea.pointIds) || polilinea.pointIds.length < 2) {
            return {ok: false, reason: "insufficient_vertices"};
        }

        const existente = buscarPorPolilinea(state, polylineId);
        if (existente && String(existente.id) !== String(opciones.ignoreInterfaceId || "")) {
            return {ok: false, reason: "already_registered", interface: existente};
        }

        const overrides = opciones.overrides || null;
        const regionPoints = puntosRegion(state, region, overrides);
        const polyPoints = puntosPolilinea(state, polilinea, overrides);
        if (regionPoints.length !== region.pointIds.length || polyPoints.length !== polilinea.pointIds.length) {
            return {ok: false, reason: "missing_point"};
        }

        const firstId = polilinea.pointIds[0];
        const lastId = polilinea.pointIds[polilinea.pointIds.length - 1];
        const domainIds = new Set(region.pointIds.map(String));
        if (!domainIds.has(String(firstId)) || !domainIds.has(String(lastId))) {
            return {ok: false, reason: "endpoints_must_be_domain_vertices"};
        }
        if (String(firstId) === String(lastId)) {
            return {ok: false, reason: "same_endpoint"};
        }

        // Los vértices internos deben permanecer estrictamente dentro del dominio.
        for (let i = 0; i < polyPoints.length; i += 1) {
            const p = polyPoints[i];
            if (!puntoEnPoligono(p, regionPoints, true)) {
                return {ok: false, reason: "point_outside_domain", pointId: polilinea.pointIds[i]};
            }
            const esExtremo = i === 0 || i === polyPoints.length - 1;
            if (!esExtremo && puntoEnBordePoligono(p, regionPoints)) {
                return {ok: false, reason: "internal_vertex_on_boundary", pointId: polilinea.pointIds[i]};
            }
        }

        if (tieneAutointerseccionPolilinea(state, polilinea, overrides)) {
            return {ok: false, reason: "self_intersection"};
        }

        const segmentosInterfaz = segmentosDeIds(state, polilinea.pointIds, overrides, false);
        const segmentosDominio = segmentosDeIds(state, region.pointIds, overrides, true);
        if (!segmentosInterfaz || !segmentosDominio) {
            return {ok: false, reason: "missing_point"};
        }

        // Un segmento no puede salir del polígono en un dominio cóncavo. Además
        // del test de intersecciones, el punto medio debe quedar en su interior.
        for (const segmento of segmentosInterfaz) {
            const medio = {
                x: (segmento.a.x + segmento.b.x) / 2,
                y: (segmento.a.y + segmento.b.y) / 2,
            };
            if (!puntoEnPoligono(medio, regionPoints, false)) {
                return {ok: false, reason: "segment_outside_domain", segmentIndex: segmento.index};
            }

            for (const borde of segmentosDominio) {
                const relacion = relacionSegmentos(segmento.a, segmento.b, borde.a, borde.b);
                if (relacion === "none") continue;
                if (relacion === "overlap" || relacion === "cross") {
                    return {ok: false, reason: "segment_crosses_domain_boundary", segmentIndex: segmento.index};
                }

                // Solo aceptamos contacto en el primer/último vértice, y debe
                // ser el mismo ID topológico que pertenece al contorno D1.
                const tocaInicio = segmento.index === 0 &&
                    (String(borde.aId) === String(firstId) || String(borde.bId) === String(firstId)) &&
                    (String(segmento.aId) === String(firstId) || String(segmento.bId) === String(firstId));
                const tocaFin = segmento.index === segmentosInterfaz.length - 1 &&
                    (String(borde.aId) === String(lastId) || String(borde.bId) === String(lastId)) &&
                    (String(segmento.aId) === String(lastId) || String(segmento.bId) === String(lastId));
                if (!tocaInicio && !tocaFin) {
                    return {ok: false, reason: "touches_domain_boundary_interior", segmentIndex: segmento.index};
                }
            }
        }

        // Para este MVP estratigráfico las interfaces no pueden cruzarse,
        // tocarse ni solaparse. Esto mantiene una partición simple en capas.
        for (const otra of interfaces(state)) {
            if (String(otra.id) === String(opciones.ignoreInterfaceId || "")) continue;
            if (String(otra.polylineId) === String(polylineId)) continue;
            const otraPolyline = obtenerPolilinea(state, otra.polylineId);
            if (!otraPolyline) continue;
            const segmentosOtra = segmentosDeIds(state, otraPolyline.pointIds, overrides, false);
            if (!segmentosOtra) continue;
            for (const a of segmentosInterfaz) {
                for (const b of segmentosOtra) {
                    if (relacionSegmentos(a.a, a.b, b.a, b.b) !== "none") {
                        return {ok: false, reason: "intersects_existing_interface", interfaceId: otra.id};
                    }
                }
            }
        }

        return {ok: true, reason: null, region, polilinea};
    }

    function definirDominio(state, regionId) {
        const geology = asegurarContenedor(state);
        const region = obtenerRegion(state, regionId);
        if (!region) return {ok: false, reason: "region_not_found", domain: null};

        if (geology.domain) {
            if (String(geology.domain.regionId) === String(regionId)) {
                return {ok: false, reason: "already_domain", domain: geology.domain};
            }
            return {ok: false, reason: "domain_already_defined", domain: geology.domain};
        }

        // El Paso 1 permitía crear estratos directamente desde regiones. El
        // nuevo flujo evita mezclar ambos enfoques dentro de un mismo modelo.
        const legacyStrata = Array.isArray(state?.strata?.items) ? state.strata.items : [];
        if (legacyStrata.length > 0) {
            return {ok: false, reason: "legacy_strata_present", domain: null};
        }

        geology.domain = {id: "D1", regionId: region.id};
        limpiarSeleccionInterfaz(state);
        marcarModificado(state);
        return {ok: true, reason: null, domain: geology.domain};
    }

    function eliminarDominio(state) {
        const geology = asegurarContenedor(state);
        if (!geology.domain) return {ok: false, reason: "no_domain", domain: null};
        if (interfaces(state).length > 0) {
            return {ok: false, reason: "interfaces_present", domain: geology.domain};
        }
        const eliminado = geology.domain;
        geology.domain = null;
        limpiarSeleccionInterfaz(state);
        marcarModificado(state);
        return {ok: true, reason: null, domain: eliminado};
    }

    function crearInterfazDesdePolilinea(state, polylineId) {
        const validacion = validarInterfaz(state, polylineId);
        if (!validacion.ok) return {...validacion, interface: validacion.interface || null};

        const interfaz = {
            id: siguienteIdInterfaz(state),
            polylineId: validacion.polilinea.id,
        };
        interfaces(state).push(interfaz);
        seleccionarInterfaz(state, interfaz.id);
        marcarModificado(state);
        return {ok: true, reason: null, interface: interfaz};
    }

    function eliminarInterfaz(state, id) {
        const items = interfaces(state);
        const indice = items.findIndex((item) => String(item.id) === String(id));
        if (indice < 0) return {ok: false, reason: "not_found", interface: null};
        const [eliminada] = items.splice(indice, 1);
        if (String(state?.ui?.selectedGeologyInterfaceId || "") === String(eliminada.id)) {
            limpiarSeleccionInterfaz(state);
        }
        marcarModificado(state);
        return {ok: true, reason: null, interface: eliminada};
    }

    function dominioUsaRegion(state, regionId) {
        const domain = dominio(state);
        return Boolean(domain && String(domain.regionId) === String(regionId));
    }

    function interfazUsaPolilinea(state, polylineId) {
        return buscarPorPolilinea(state, polylineId);
    }

    function puntoEsExtremoInterfaz(state, pointId) {
        for (const interfaz of interfaces(state)) {
            const polilinea = obtenerPolilinea(state, interfaz.polylineId);
            if (!polilinea?.pointIds?.length) continue;
            const primero = polilinea.pointIds[0];
            const ultimo = polilinea.pointIds[polilinea.pointIds.length - 1];
            if (String(primero) === String(pointId) || String(ultimo) === String(pointId)) {
                return interfaz;
            }
        }
        return null;
    }

    function validarEdicionPunto(state, pointId, coordenada) {
        if (!dominio(state) || interfaces(state).length === 0) {
            return {ok: true, reason: null};
        }
        const overrides = {
            [String(pointId)]: {x: Number(coordenada.x), y: Number(coordenada.y)},
        };
        for (const interfaz of interfaces(state)) {
            const validacion = validarInterfaz(state, interfaz.polylineId, {
                overrides,
                ignoreInterfaceId: interfaz.id,
            });
            if (!validacion.ok) {
                return {
                    ok: false,
                    reason: "geology_interface_invalid",
                    detailReason: validacion.reason,
                    interfaceId: interfaz.id,
                };
            }
        }
        return {ok: true, reason: null};
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

    function puntoMedioPolilinea(lista = []) {
        if (!lista.length) return null;
        return lista[Math.floor((lista.length - 1) / 2)] || lista[0];
    }

    function renderGeology(layer, state, viewport) {
        if (!layer || typeof document === "undefined") return;
        layer.replaceChildren();

        const domain = dominio(state);
        if (domain) {
            const region = obtenerRegion(state, domain.regionId);
            const modelo = region ? puntosRegion(state, region) : [];
            if (modelo.length >= 3) {
                const pantalla = modelo.map((p) => global.GeoFEMViewport.modelToScreen(p, viewport));
                layer.appendChild(crearElementoSvg("polygon", {
                    points: atributoPoints(pantalla),
                    fill: "#0f766e",
                    "fill-opacity": 0.035,
                    stroke: "#0f766e",
                    "stroke-width": 5,
                    "stroke-dasharray": "14 7",
                    "stroke-linejoin": "round",
                    "vector-effect": "non-scaling-stroke",
                    "pointer-events": "none",
                }));
                const centro = centroideSimple(pantalla);
                if (centro) {
                    const texto = crearElementoSvg("text", {
                        x: centro.x,
                        y: centro.y - 18,
                        "text-anchor": "middle",
                        fill: "#115e59",
                        "font-size": 14,
                        "font-weight": 900,
                        "paint-order": "stroke",
                        stroke: "#ffffff",
                        "stroke-width": 4,
                        "pointer-events": "none",
                    });
                    texto.textContent = `${domain.id} · Dominio`;
                    layer.appendChild(texto);
                }
            }
        }

        interfaces(state).forEach((interfaz) => {
            const polilinea = obtenerPolilinea(state, interfaz.polylineId);
            if (!polilinea) return;
            const modelo = puntosPolilinea(state, polilinea);
            if (modelo.length < 2) return;
            const pantalla = modelo.map((p) => global.GeoFEMViewport.modelToScreen(p, viewport));

            layer.appendChild(crearElementoSvg("polyline", {
                points: atributoPoints(pantalla),
                fill: "none",
                stroke: "#7c3aed",
                "stroke-width": 6,
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));

            const medio = puntoMedioPolilinea(pantalla);
            if (medio) {
                const texto = crearElementoSvg("text", {
                    x: medio.x,
                    y: medio.y - 11,
                    "text-anchor": "middle",
                    fill: "#6d28d9",
                    "font-size": 13,
                    "font-weight": 900,
                    "paint-order": "stroke",
                    stroke: "#ffffff",
                    "stroke-width": 4,
                    "pointer-events": "none",
                });
                texto.textContent = `${interfaz.id} · Interfaz`;
                layer.appendChild(texto);
            }
        });
    }

    const api = {
        dominio,
        interfaces,
        obtenerInterfaz,
        buscarPorPolilinea,
        interfazSeleccionada,
        seleccionarInterfaz,
        limpiarSeleccionInterfaz,
        definirDominio,
        eliminarDominio,
        validarInterfaz,
        crearInterfazDesdePolilinea,
        eliminarInterfaz,
        dominioUsaRegion,
        interfazUsaPolilinea,
        puntoEsExtremoInterfaz,
        validarEdicionPunto,
        puntoEnPoligono,
        renderGeology,
    };

    global.GeoFEMGeology = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
