/*
 * GeoFEM - Snap CAD
 * -----------------
 * Sprint 1 / Paso 8
 *
 * Resuelve ayudas de precisión del cursor sin modificar directamente la
 * geometría. El snap trabaja en pantalla para mantener una tolerancia estable
 * aunque cambie el zoom del viewport.
 *
 * Prioridad actual:
 *   1) vértice/punto existente;
 *   2) intersección del grid visible.
 */

(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    function numeroFinito(valor, respaldo = 0) {
        const numero = Number(valor);
        return Number.isFinite(numero) ? numero : respaldo;
    }

    function configuracion(state) {
        const snap = state?.viewport?.snap || {};
        return {
            enabled: snap.enabled !== false,
            points: snap.points !== false,
            grid: snap.grid !== false,
            tolerancePx: Math.max(numeroFinito(snap.tolerancePx, 12), 1),
        };
    }

    function distancia(a, b) {
        return Math.hypot(
            numeroFinito(a?.x) - numeroFinito(b?.x),
            numeroFinito(a?.y) - numeroFinito(b?.y)
        );
    }

    function toleranciaSvgDesdePixeles(svg, evento, tolerancePx) {
        const origen = global.GeoFEMViewport.clientToSvg(
            svg,
            evento.clientX,
            evento.clientY
        );
        const desplazadoX = global.GeoFEMViewport.clientToSvg(
            svg,
            evento.clientX + tolerancePx,
            evento.clientY
        );
        const desplazadoY = global.GeoFEMViewport.clientToSvg(
            svg,
            evento.clientX,
            evento.clientY + tolerancePx
        );

        return Math.max(
            distancia(origen, desplazadoX),
            distancia(origen, desplazadoY)
        );
    }

    function candidatoPunto(state, viewport, puntoSvg, toleranciaSvg) {
        const lista = Array.isArray(state?.geometry?.points)
            ? state.geometry.points
            : [];

        let mejor = null;

        lista.forEach((punto) => {
            const pantalla = global.GeoFEMViewport.modelToScreen(punto, viewport);
            const distanciaSvg = distancia(pantalla, puntoSvg);

            if (distanciaSvg > toleranciaSvg) {
                return;
            }

            if (!mejor || distanciaSvg < mejor.distanceSvg) {
                mejor = {
                    type: "point",
                    pointId: punto.id,
                    model: {x: punto.x, y: punto.y},
                    svg: pantalla,
                    distanceSvg: distanciaSvg,
                };
            }
        });

        return mejor;
    }

    function candidatoGrid(state, viewport, puntoModelo, puntoSvg, toleranciaSvg) {
        const paso = global.GeoFEMViewport.gridSpacingModel(viewport);
        if (!(paso > 0)) {
            return null;
        }

        const model = {
            x: Math.round(puntoModelo.x / paso) * paso,
            y: Math.round(puntoModelo.y / paso) * paso,
        };
        const pantalla = global.GeoFEMViewport.modelToScreen(model, viewport);
        const distanciaSvg = distancia(pantalla, puntoSvg);

        if (distanciaSvg > toleranciaSvg) {
            return null;
        }

        return {
            type: "grid",
            pointId: null,
            model,
            svg: pantalla,
            distanceSvg: distanciaSvg,
            gridStep: paso,
        };
    }

    /*
     * Devuelve las coordenadas crudas y, si existe, el candidato de snap.
     * `allowGrid=false` se usa en herramientas que deben seleccionar un punto
     * topológico existente (línea/polilínea), no una coordenada libre.
     */
    function resolverEvento(svg, evento, state, viewport, opciones = {}) {
        const conversion = global.GeoFEMViewport.eventToModel(svg, evento, viewport);
        const cfg = configuracion(state);
        const allowPoint = opciones.allowPoint !== false;
        const allowGrid = opciones.allowGrid !== false;

        if (!cfg.enabled) {
            return {
                raw: conversion,
                candidate: null,
                model: conversion.model,
                svg: conversion.svg,
            };
        }

        const toleranciaSvg = toleranciaSvgDesdePixeles(
            svg,
            evento,
            cfg.tolerancePx
        );

        if (cfg.points && allowPoint) {
            const punto = candidatoPunto(
                state,
                viewport,
                conversion.svg,
                toleranciaSvg
            );
            if (punto) {
                return {
                    raw: conversion,
                    candidate: punto,
                    model: {...punto.model},
                    svg: {...punto.svg},
                };
            }
        }

        if (cfg.grid && allowGrid) {
            const grid = candidatoGrid(
                state,
                viewport,
                conversion.model,
                conversion.svg,
                toleranciaSvg
            );
            if (grid) {
                return {
                    raw: conversion,
                    candidate: grid,
                    model: {...grid.model},
                    svg: {...grid.svg},
                };
            }
        }

        return {
            raw: conversion,
            candidate: null,
            model: conversion.model,
            svg: conversion.svg,
        };
    }

    function establecerCandidato(state, candidate) {
        if (!state?.ui) {
            return;
        }

        if (!candidate) {
            state.ui.snapCandidate = null;
            return;
        }

        state.ui.snapCandidate = {
            type: candidate.type,
            pointId: candidate.pointId || null,
            model: candidate.model
                ? {x: candidate.model.x, y: candidate.model.y}
                : null,
            gridStep: candidate.gridStep || null,
        };
    }

    function limpiarCandidato(state) {
        establecerCandidato(state, null);
    }

    function candidatoActual(state) {
        return state?.ui?.snapCandidate || null;
    }

    function etiquetaCandidato(candidate) {
        if (!candidate) {
            return "--";
        }
        if (candidate.type === "point") {
            return `Punto ${candidate.pointId}`;
        }
        if (candidate.type === "grid") {
            return "Grid";
        }
        return "--";
    }

    function crearElementoSvg(nombre, atributos = {}) {
        const elemento = document.createElementNS(SVG_NS, nombre);
        Object.entries(atributos).forEach(([clave, valor]) => {
            elemento.setAttribute(clave, String(valor));
        });
        return elemento;
    }

    function renderIndicator(layer, state, viewport) {
        if (!layer || typeof document === "undefined") {
            return;
        }

        layer.replaceChildren();

        const candidate = candidatoActual(state);
        if (!candidate?.model || state?.viewport?.snap?.enabled === false) {
            return;
        }

        const p = global.GeoFEMViewport.modelToScreen(candidate.model, viewport);
        const stroke = candidate.type === "point" ? "#0e7490" : "#7c3aed";

        if (candidate.type === "point") {
            layer.appendChild(crearElementoSvg("rect", {
                x: p.x - 8,
                y: p.y - 8,
                width: 16,
                height: 16,
                fill: "none",
                stroke,
                "stroke-width": 2.5,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
        } else {
            layer.appendChild(crearElementoSvg("path", {
                d: `M ${p.x} ${p.y - 9} L ${p.x + 9} ${p.y} L ${p.x} ${p.y + 9} L ${p.x - 9} ${p.y} Z`,
                fill: "none",
                stroke,
                "stroke-width": 2.25,
                "vector-effect": "non-scaling-stroke",
                "pointer-events": "none",
            }));
        }

        layer.appendChild(crearElementoSvg("line", {
            x1: p.x - 12,
            y1: p.y,
            x2: p.x + 12,
            y2: p.y,
            stroke,
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke",
            "pointer-events": "none",
        }));
        layer.appendChild(crearElementoSvg("line", {
            x1: p.x,
            y1: p.y - 12,
            x2: p.x,
            y2: p.y + 12,
            stroke,
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke",
            "pointer-events": "none",
        }));

        const texto = crearElementoSvg("text", {
            x: p.x + 14,
            y: p.y - 12,
            fill: stroke,
            "font-size": 13,
            "font-weight": 700,
            "pointer-events": "none",
        });
        texto.textContent = candidate.type === "point"
            ? candidate.pointId
            : "GRID";
        layer.appendChild(texto);
    }

    const api = {
        configuracion,
        resolverEvento,
        establecerCandidato,
        limpiarCandidato,
        candidatoActual,
        etiquetaCandidato,
        renderIndicator,
    };

    global.GeoFEMSnap = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
