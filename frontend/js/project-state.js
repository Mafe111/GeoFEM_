/*
 * GeoFEM - Project State
 * ----------------------
 * Este archivo define la fuente de verdad del modelo abierto en el frontend.
 * El SVG NO almacena el modelo: solo representa visualmente este estado.
 *
 * Se mantiene como JavaScript clásico (sin módulos ES) para que funcione de
 * manera simple dentro de QWebEngine/QWebChannel durante el MVP.
 */

(function (global) {
    "use strict";

    const STATE_SCHEMA_VERSION = "2.0.0";

    function normalizarProyecto(proyecto = {}) {
        return {
            id: proyecto.id !== undefined && proyecto.id !== null
                ? Number(proyecto.id)
                : null,
            nombre: proyecto.nombre || "",
            codigo: proyecto.codigo || "",
            ubicacion: proyecto.ubicacion || "",
            fechaCreacion: proyecto.fecha_creacion || proyecto.fechaCreacion || null,
            fechaUltimaModificacion:
                proyecto.fecha_ultima_mod ||
                proyecto.fechaUltimaModificacion ||
                null,
        };
    }

    function crearProjectState(proyecto = {}) {
        return {
            schemaVersion: STATE_SCHEMA_VERSION,

            project: normalizarProyecto(proyecto),

            units: {
                longitud: "m",
                esfuerzo: "kPa",
                pesoUnitario: "kN/m³",
            },

            geometry: {
                points: [],
                lines: [],
                polylines: [],
                regions: [],

                // Contadores monotónicos para mantener identificadores estables.
                // Si P2 se elimina, el siguiente punto será P4 (no se reutiliza P2).
                nextIds: {
                    point: 1,
                    line: 1,
                    polyline: 1,
                    region: 1,
                },
            },

            // Capa semántica geotécnica. Cada estrato referencia una región
            // geométrica existente; nunca duplica sus coordenadas.
            strata: {
                items: [],
                nextId: 1,
            },

            materials: [],

            mesh: {
                elementType: "T3",
                nodes: [],
                elements: [],
                visible: true,
            },

            boundaryConditions: [],
            loads: [],

            analysis: {
                method: "SSR",
                settings: {
                    kh: 0.0,
                    kv: 0.0,
                    tolerance: 0.001,
                    maxIterations: 500,
                    initialSrf: 1.0,
                    srfIncrement: 0.05,
                },
            },

            results: {
                fos: null,
                displacements: [],
                stresses: [],
                failureBand: [],
                converged: null,
            },

            viewport: {
                // Sistema de coordenadas del CAD. Las coordenadas del modelo
                // siempre se almacenan en unidades de ingeniería (m).
                // `originSvg` y `baseScale` solo controlan cómo se observan
                // dentro del SVG; nunca modifican la geometría real.
                viewBox: {
                    x: 0,
                    y: 0,
                    width: 1200,
                    height: 800,
                },
                originSvg: {
                    x: 100,
                    y: 700,
                },
                baseScale: 20.0, // unidades SVG por metro a zoom = 1
                zoom: 1.0,
                minZoom: 0.20,
                maxZoom: 8.0,
                pan: {
                    x: 0,
                    y: 0,
                },
                grid: {
                    enabled: true,
                    dynamic: true,
                    // El Paso 3 calcula automáticamente un espaciado legible
                    // intentando mantener ~32 unidades SVG entre líneas menores.
                    targetMinorSvg: 32,
                    spacingModel: 1.0,
                    majorEvery: 5,
                },
                snap: {
                    // El snap es una ayuda de precisión del viewport; no cambia
                    // por sí mismo la geometría existente. En este paso se
                    // soportan dos modos: vértices existentes y grid visible.
                    enabled: true,
                    points: true,
                    grid: true,
                    tolerancePx: 12,
                },
            },

            ui: {
                activeModule: "geometria",
                activeTool: "select",
                selection: [],
                lineDraftStartPointId: null,
                polylineDraftPointIds: [],
                polylineDraftCursorModel: null,

                // Borrador de región cerrada. Almacena IDs únicos; el primer
                // punto NO se repite al final. El cierre es una propiedad
                // topológica implícita de la entidad Region.
                regionDraftPointIds: [],
                regionDraftCursorModel: null,

                // Edición topológica de regiones. Mientras una herramienta de
                // edición está activa conservamos explícitamente el ID de la
                // región objetivo para no depender de la selección visual.
                regionEditTargetId: null,

                // Selección semántica independiente de la selección CAD.
                selectedStratumId: null,

                // Candidato temporal de snap bajo el cursor. Es estado de UI,
                // no geometría persistente y nunca debe marcar dirty.
                snapCandidate: null,
            },

            dirty: false,
        };
    }

    function contarGeometria(state) {
        const geometry = state && state.geometry ? state.geometry : {};

        return {
            points: Array.isArray(geometry.points) ? geometry.points.length : 0,
            lines: Array.isArray(geometry.lines) ? geometry.lines.length : 0,
            polylines: Array.isArray(geometry.polylines)
                ? geometry.polylines.length
                : 0,
            regions: Array.isArray(geometry.regions) ? geometry.regions.length : 0,
        };
    }

    function resumenProjectState(state) {
        const geometry = contarGeometria(state);
        const mesh = state && state.mesh ? state.mesh : {};

        return {
            projectId: state?.project?.id ?? null,
            projectName: state?.project?.nombre ?? "",
            geometry,
            strata: Array.isArray(state?.strata?.items) ? state.strata.items.length : 0,
            materials: Array.isArray(state?.materials) ? state.materials.length : 0,
            nodes: Array.isArray(mesh.nodes) ? mesh.nodes.length : 0,
            elements: Array.isArray(mesh.elements) ? mesh.elements.length : 0,
            dirty: Boolean(state?.dirty),
        };
    }

    function marcarModificado(state, valor = true) {
        if (!state) {
            return;
        }

        state.dirty = Boolean(valor);
    }

    const api = {
        STATE_SCHEMA_VERSION,
        crearProjectState,
        contarGeometria,
        resumenProjectState,
        marcarModificado,
    };

    global.GeoFEMState = api;

    // Permite probar este archivo con Node.js sin afectar QWebEngine.
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
