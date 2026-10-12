/*
 * GeoFEM - Viewport CAD
 * ---------------------
 * Conversión entre:
 *   1) coordenadas del modelo geotécnico (X,Y en metros), y
 *   2) coordenadas internas del SVG (sx,sy en unidades del viewBox).
 *
 * Convención del modelo:
 *   +X hacia la derecha
 *   +Y hacia arriba
 *
 * Convención SVG:
 *   +x hacia la derecha
 *   +y hacia abajo
 *
 * El eje Y debe invertirse durante la transformación.
 */

(function (global) {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    function numeroFinito(valor, respaldo = 0) {
        const numero = Number(valor);
        return Number.isFinite(numero) ? numero : respaldo;
    }

    function escalaEfectiva(viewport) {
        const baseScale = numeroFinito(viewport?.baseScale, 20);
        const zoom = numeroFinito(viewport?.zoom, 1);
        const escala = baseScale * zoom;

        if (!(escala > 0)) {
            throw new Error("La escala efectiva del viewport debe ser mayor que cero.");
        }

        return escala;
    }

    function parametrosViewport(viewport = {}) {
        return {
            originX: numeroFinito(viewport?.originSvg?.x, 100),
            originY: numeroFinito(viewport?.originSvg?.y, 700),
            panX: numeroFinito(viewport?.pan?.x, 0),
            panY: numeroFinito(viewport?.pan?.y, 0),
            scale: escalaEfectiva(viewport),
        };
    }

    function modelToScreen(puntoModelo, viewport = {}) {
        const {originX, originY, panX, panY, scale} =
            parametrosViewport(viewport);

        const x = numeroFinito(puntoModelo?.x, 0);
        const y = numeroFinito(puntoModelo?.y, 0);

        return {
            x: originX + panX + x * scale,
            // Inversión intencional del eje Y: en ingeniería +Y sube.
            y: originY + panY - y * scale,
        };
    }

    function screenToModel(puntoSvg, viewport = {}) {
        const {originX, originY, panX, panY, scale} =
            parametrosViewport(viewport);

        const sx = numeroFinito(puntoSvg?.x, 0);
        const sy = numeroFinito(puntoSvg?.y, 0);

        return {
            x: (sx - originX - panX) / scale,
            y: -(sy - originY - panY) / scale,
        };
    }

    /*
     * Convierte coordenadas del navegador (clientX/clientY) a unidades del
     * viewBox SVG. Esto es necesario porque el SVG se redimensiona con CSS y
     * 1 píxel físico de la ventana no equivale necesariamente a 1 unidad SVG.
     */
    function clientToSvg(svg, clientX, clientY) {
        if (!svg || typeof svg.createSVGPoint !== "function") {
            throw new Error("Se requiere un elemento SVG válido.");
        }

        const matriz = svg.getScreenCTM();

        if (!matriz) {
            throw new Error("No fue posible obtener la matriz de transformación del SVG.");
        }

        const punto = svg.createSVGPoint();
        punto.x = numeroFinito(clientX, 0);
        punto.y = numeroFinito(clientY, 0);

        const convertido = punto.matrixTransform(matriz.inverse());

        return {
            x: convertido.x,
            y: convertido.y,
        };
    }

    function eventToModel(svg, evento, viewport = {}) {
        const puntoSvg = clientToSvg(
            svg,
            evento?.clientX,
            evento?.clientY
        );

        return {
            svg: puntoSvg,
            model: screenToModel(puntoSvg, viewport),
        };
    }

    function crearElementoSvg(nombre, atributos = {}) {
        const elemento = document.createElementNS(SVG_NS, nombre);

        Object.entries(atributos).forEach(([clave, valor]) => {
            elemento.setAttribute(clave, String(valor));
        });

        return elemento;
    }

    /*
     * Dibuja únicamente una referencia visual de los ejes del sistema.
     * Los ejes NO forman parte de la geometría ni del modelo FEM.
     */
    function renderReferenceAxes(layer, viewport = {}) {
        if (!layer || typeof document === "undefined") {
            return;
        }

        layer.replaceChildren();

        const origen = modelToScreen({x: 0, y: 0}, viewport);
        const longitudModelo = 6;
        const extremoX = modelToScreen({x: longitudModelo, y: 0}, viewport);
        const extremoY = modelToScreen({x: 0, y: longitudModelo}, viewport);

        const estiloLinea = {
            stroke: "#0f766e",
            "stroke-width": 2,
            "vector-effect": "non-scaling-stroke",
            opacity: 0.9,
        };

        layer.append(
            crearElementoSvg("line", {
                x1: origen.x,
                y1: origen.y,
                x2: extremoX.x,
                y2: extremoX.y,
                ...estiloLinea,
            }),
            crearElementoSvg("line", {
                x1: origen.x,
                y1: origen.y,
                x2: extremoY.x,
                y2: extremoY.y,
                ...estiloLinea,
            })
        );

        const puntoOrigen = crearElementoSvg("circle", {
            cx: origen.x,
            cy: origen.y,
            r: 4,
            fill: "#0f766e",
        });

        const etiquetaX = crearElementoSvg("text", {
            x: extremoX.x + 10,
            y: extremoX.y + 5,
            fill: "#0f766e",
            "font-size": 15,
            "font-weight": 700,
        });
        etiquetaX.textContent = "X";

        const etiquetaY = crearElementoSvg("text", {
            x: extremoY.x - 5,
            y: extremoY.y - 10,
            fill: "#0f766e",
            "font-size": 15,
            "font-weight": 700,
        });
        etiquetaY.textContent = "Y";

        const etiquetaOrigen = crearElementoSvg("text", {
            x: origen.x + 9,
            y: origen.y + 18,
            fill: "#64748b",
            "font-size": 11,
        });
        etiquetaOrigen.textContent = "(0, 0) m";

        layer.append(puntoOrigen, etiquetaX, etiquetaY, etiquetaOrigen);
    }

    function roundTripError(puntoModelo, viewport = {}) {
        const pantalla = modelToScreen(puntoModelo, viewport);
        const recuperado = screenToModel(pantalla, viewport);

        return {
            original: {
                x: numeroFinito(puntoModelo?.x, 0),
                y: numeroFinito(puntoModelo?.y, 0),
            },
            screen: pantalla,
            recovered: recuperado,
            errorX: Math.abs(recuperado.x - numeroFinito(puntoModelo?.x, 0)),
            errorY: Math.abs(recuperado.y - numeroFinito(puntoModelo?.y, 0)),
        };
    }

    const api = {
        escalaEfectiva,
        modelToScreen,
        screenToModel,
        clientToSvg,
        eventToModel,
        renderReferenceAxes,
        roundTripError,
    };

    global.GeoFEMViewport = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
