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


    function limitar(valor, minimo, maximo) {
        return Math.min(Math.max(valor, minimo), maximo);
    }

    function limitesZoom(viewport = {}) {
        const minimo = Math.max(numeroFinito(viewport?.minZoom, 0.20), 0.01);
        const maximo = Math.max(numeroFinito(viewport?.maxZoom, 8.0), minimo);

        return {minimo, maximo};
    }

    /*
     * Cambia el zoom conservando inmóvil el punto del modelo que está debajo
     * del cursor. Es el comportamiento esperado en un CAD: la rueda acerca o
     * aleja exactamente la zona que el usuario está observando.
     */
    function setZoomAtSvgPoint(viewport, nuevoZoom, puntoAnclaSvg) {
        if (!viewport) {
            throw new Error("Se requiere un viewport válido para modificar el zoom.");
        }

        const ancla = {
            x: numeroFinito(puntoAnclaSvg?.x, 0),
            y: numeroFinito(puntoAnclaSvg?.y, 0),
        };
        const modeloBajoCursor = screenToModel(ancla, viewport);
        const {minimo, maximo} = limitesZoom(viewport);

        viewport.zoom = limitar(numeroFinito(nuevoZoom, 1), minimo, maximo);

        const pantallaDespues = modelToScreen(modeloBajoCursor, viewport);
        viewport.pan.x += ancla.x - pantallaDespues.x;
        viewport.pan.y += ancla.y - pantallaDespues.y;

        return viewport.zoom;
    }

    function zoomByFactorAtSvgPoint(viewport, factor, puntoAnclaSvg) {
        const factorSeguro = Math.max(numeroFinito(factor, 1), 0.01);
        const zoomActual = numeroFinito(viewport?.zoom, 1);

        return setZoomAtSvgPoint(
            viewport,
            zoomActual * factorSeguro,
            puntoAnclaSvg
        );
    }

    function panBySvgDelta(viewport, deltaX, deltaY) {
        if (!viewport) {
            throw new Error("Se requiere un viewport válido para desplazar la vista.");
        }

        viewport.pan.x += numeroFinito(deltaX, 0);
        viewport.pan.y += numeroFinito(deltaY, 0);

        return {...viewport.pan};
    }

    function resetView(viewport) {
        if (!viewport) {
            return;
        }

        viewport.zoom = 1.0;
        viewport.pan.x = 0;
        viewport.pan.y = 0;
    }

    function visibleModelBounds(viewport = {}) {
        const viewBox = viewport?.viewBox || {};
        const x0 = numeroFinito(viewBox.x, 0);
        const y0 = numeroFinito(viewBox.y, 0);
        const x1 = x0 + numeroFinito(viewBox.width, 1200);
        const y1 = y0 + numeroFinito(viewBox.height, 800);

        const a = screenToModel({x: x0, y: y0}, viewport);
        const b = screenToModel({x: x1, y: y1}, viewport);

        return {
            minX: Math.min(a.x, b.x),
            maxX: Math.max(a.x, b.x),
            minY: Math.min(a.y, b.y),
            maxY: Math.max(a.y, b.y),
        };
    }

    // Redondea un paso arbitrario a la serie 1-2-5 × 10^n. Esta serie es
    // habitual en ejes, mapas y CAD porque produce escalas fáciles de leer.
    function niceStep(valor) {
        const positivo = Math.max(Math.abs(numeroFinito(valor, 1)), 1e-12);
        const potencia = Math.pow(10, Math.floor(Math.log10(positivo)));
        const normalizado = positivo / potencia;

        let factor;
        if (normalizado <= 1) {
            factor = 1;
        } else if (normalizado <= 2) {
            factor = 2;
        } else if (normalizado <= 5) {
            factor = 5;
        } else {
            factor = 10;
        }

        return factor * potencia;
    }

    function gridSpacingModel(viewport = {}) {
        const grid = viewport?.grid || {};

        if (grid.dynamic === false) {
            return Math.max(numeroFinito(grid.spacingModel, 1), 1e-9);
        }

        const objetivoSvg = Math.max(numeroFinito(grid.targetMinorSvg, 32), 8);
        const pasoIdealModelo = objetivoSvg / escalaEfectiva(viewport);

        return niceStep(pasoIdealModelo);
    }

    function renderGrid(layer, viewport = {}) {
        if (!layer || typeof document === "undefined") {
            return null;
        }

        layer.replaceChildren();

        if (viewport?.grid?.enabled === false) {
            return null;
        }

        const paso = gridSpacingModel(viewport);
        const majorEvery = Math.max(1, Math.round(numeroFinito(viewport?.grid?.majorEvery, 5)));
        const bounds = visibleModelBounds(viewport);
        const epsilon = paso * 1e-8;

        let dMenor = "";
        let dMayor = "";

        const indiceX0 = Math.floor((bounds.minX + epsilon) / paso);
        const indiceX1 = Math.ceil((bounds.maxX - epsilon) / paso);
        const indiceY0 = Math.floor((bounds.minY + epsilon) / paso);
        const indiceY1 = Math.ceil((bounds.maxY - epsilon) / paso);

        for (let i = indiceX0; i <= indiceX1; i += 1) {
            const xModelo = i * paso;
            const p1 = modelToScreen({x: xModelo, y: bounds.minY}, viewport);
            const p2 = modelToScreen({x: xModelo, y: bounds.maxY}, viewport);
            const segmento = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} `;

            if (Math.abs(i) % majorEvery === 0) {
                dMayor += segmento;
            } else {
                dMenor += segmento;
            }
        }

        for (let j = indiceY0; j <= indiceY1; j += 1) {
            const yModelo = j * paso;
            const p1 = modelToScreen({x: bounds.minX, y: yModelo}, viewport);
            const p2 = modelToScreen({x: bounds.maxX, y: yModelo}, viewport);
            const segmento = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} `;

            if (Math.abs(j) % majorEvery === 0) {
                dMayor += segmento;
            } else {
                dMenor += segmento;
            }
        }

        if (dMenor) {
            layer.appendChild(
                crearElementoSvg("path", {
                    d: dMenor.trim(),
                    fill: "none",
                    stroke: "#edf2f7",
                    "stroke-width": 1,
                    "vector-effect": "non-scaling-stroke",
                    "pointer-events": "none",
                })
            );
        }

        if (dMayor) {
            layer.appendChild(
                crearElementoSvg("path", {
                    d: dMayor.trim(),
                    fill: "none",
                    stroke: "#dbe4ee",
                    "stroke-width": 1.25,
                    "vector-effect": "non-scaling-stroke",
                    "pointer-events": "none",
                })
            );
        }

        return paso;
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
        setZoomAtSvgPoint,
        zoomByFactorAtSvgPoint,
        panBySvgDelta,
        resetView,
        visibleModelBounds,
        gridSpacingModel,
        renderGrid,
        renderReferenceAxes,
        roundTripError,
    };

    global.GeoFEMViewport = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
