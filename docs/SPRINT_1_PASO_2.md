# GeoFEM — Sprint 1 / Paso 2

## Sistema de coordenadas del CAD

### Objetivo

Implementar la conversión entre las coordenadas reales del modelo geotécnico y las coordenadas internas del SVG.

Al finalizar este paso GeoFEM debe:

- conservar X/Y del modelo en metros;
- interpretar +X hacia la derecha y +Y hacia arriba;
- convertir esas coordenadas a las unidades internas del SVG;
- invertir correctamente el eje Y del SVG;
- convertir la posición real del cursor del navegador a coordenadas X/Y del modelo;
- mostrar las coordenadas del cursor en la barra inferior;
- mostrar unos ejes X/Y de referencia que NO pertenecen a la geometría;
- comprobar matemáticamente que modelo → SVG → modelo recupera el punto original.

---

## 1. Por qué necesitamos dos sistemas de coordenadas

En ingeniería utilizaremos un sistema cartesiano convencional:

```text
             +Y
              ↑
              |
              |
(0,0) --------+--------→ +X
```

Si un punto tiene:

```text
X = 10 m
Y = 5 m
```

esas son sus coordenadas reales y deben mantenerse aunque el usuario haga zoom, pan o cambie el tamaño de la ventana.

SVG utiliza otra convención:

```text
(0,0) ----------------→ +x
  |
  |
  ↓
 +y
```

Por tanto el eje Y se encuentra invertido respecto al sistema de ingeniería.

---

## 2. Parámetros añadidos a `projectState.viewport`

El estado del viewport contiene ahora:

```javascript
viewport: {
    viewBox: {
        x: 0,
        y: 0,
        width: 1200,
        height: 800
    },

    originSvg: {
        x: 100,
        y: 700
    },

    baseScale: 20.0,
    zoom: 1.0,

    pan: {
        x: 0,
        y: 0
    }
}
```

### `originSvg`

Indica dónde se dibuja el origen `(0,0)` del modelo dentro del SVG.

Con:

```javascript
originSvg = {x: 100, y: 700}
```

el punto geotécnico `(0,0)` aparece cerca de la esquina inferior izquierda del canvas.

### `baseScale`

```javascript
baseScale = 20
```

significa inicialmente:

```text
1 metro del modelo = 20 unidades del viewBox SVG
```

No representa una escala topográfica de impresión. Es una transformación de visualización.

### `zoom`

En este paso permanece:

```javascript
zoom = 1
```

En el Paso 3 lo modificaremos dinámicamente.

### `pan`

En este paso permanece en cero:

```javascript
pan = {x: 0, y: 0}
```

Posteriormente permitirá desplazar la cámara sin modificar las coordenadas reales del modelo.

---

## 3. Transformación modelo → SVG

La escala efectiva es:

```text
s = baseScale × zoom
```

La coordenada horizontal se transforma mediante:

```text
sx = originX + panX + X × s
```

La coordenada vertical necesita invertir el eje:

```text
sy = originY + panY - Y × s
```

El signo negativo delante de `Y` es intencional.

### Ejemplo

Para:

```text
originSvg = (100, 700)
baseScale = 20
zoom = 1
pan = (0,0)
P = (10 m, 5 m)
```

obtenemos:

```text
sx = 100 + 10 × 20 = 300
sy = 700 - 5 × 20  = 600
```

Por tanto:

```text
Modelo (10,5) m
      ↓
SVG (300,600)
```

---

## 4. Transformación SVG → modelo

Necesitamos también la operación inversa:

```text
X = (sx - originX - panX) / s
```

```text
Y = -(sy - originY - panY) / s
```

Esto permitirá que un clic del mouse se convierta posteriormente en una coordenada geotécnica real.

---

## 5. Nuevo archivo `frontend/js/viewport.js`

Este archivo concentra la lógica de coordenadas.

Funciones principales:

```javascript
GeoFEMViewport.modelToScreen()
GeoFEMViewport.screenToModel()
GeoFEMViewport.clientToSvg()
GeoFEMViewport.eventToModel()
```

### `modelToScreen`

Recibe:

```javascript
{x: 10, y: 5}
```

y devuelve su posición en el SVG.

### `screenToModel`

Hace la operación inversa.

### `clientToSvg`

Esta función es especialmente importante.

El navegador entrega el mouse mediante:

```javascript
event.clientX
event.clientY
```

pero esas coordenadas están medidas en píxeles CSS de la ventana, no directamente en las unidades del `viewBox="0 0 1200 800"`.

Por eso utilizamos:

```javascript
svg.getScreenCTM()
```

y la matriz inversa para obtener correctamente las coordenadas internas del SVG incluso si el canvas cambia de tamaño.

### `eventToModel`

Une las dos conversiones:

```text
Mouse del navegador
      ↓
clientToSvg()
      ↓
coordenada SVG
      ↓
screenToModel()
      ↓
X/Y en metros
```

---

## 6. Ejes visuales X/Y

Se añadió:

```html
<g id="coordinateReferenceLayer"></g>
```

Aquí se dibujan unos ejes de referencia.

Importante:

```text
Ejes del viewport ≠ geometría
```

No serán enviados al FEM, no se guardarán como líneas del proyecto y no se contarán como entidades.

Su único objetivo es ayudar a entender la orientación del sistema cartesiano.

---

## 7. Lectura de coordenadas del cursor

En la barra inferior aparece ahora:

```text
Cursor: X -- m · Y -- m
```

Cuando el mouse entra al canvas y se mueve, GeoFEM realiza:

```text
pointermove
    ↓
eventToModel()
    ↓
X/Y reales
    ↓
barra de estado
```

Deberás observar que:

- al mover el mouse hacia la derecha, X aumenta;
- al mover el mouse hacia arriba, Y aumenta;
- al moverlo hacia abajo, Y disminuye;
- al salir del canvas, vuelve a `--`.

Todavía permitimos coordenadas negativas. Esto es correcto: un CAD no debe imponer artificialmente que toda geometría esté en el primer cuadrante.

---

## 8. Prueba matemática automática

Al cargar la aplicación se ejecuta una comprobación de ida y vuelta con:

```text
P = (10,5)
```

El resultado esperado conceptualmente es:

```text
original  = (10,5)
screen    = (300,600)
recovered = (10,5)
errorX    = 0
errorY    = 0
```

Esta prueba no reemplaza los tests automatizados que construiremos posteriormente, pero nos permite comprobar inmediatamente la consistencia de las dos transformaciones.

---

## 9. Qué NO se implementa todavía

Este paso NO incorpora:

- zoom con rueda;
- pan;
- grid dinámico;
- snap;
- dibujo de puntos;
- dibujo de líneas;
- polígonos;
- persistencia de geometría.

Todo eso dependerá del sistema de coordenadas que estamos construyendo ahora.

---

## 10. Prueba funcional en GeoFEM

1. Mantenerse en:

```text
feature/sprint1-cad-core
```

2. Copiar los archivos del PATCH sobre el proyecto actual.

3. Activar `.venv` si fuera necesario.

4. Ejecutar:

```powershell
python app.py
```

5. Hacer login.

6. Abrir un proyecto.

7. Verificar en el panel derecho:

```text
Viewport CAD
Unidades: m
Escala: 20.00 SVG/m
Origen SVG: (100, 700)
Convención Y: positiva hacia arriba
```

8. Verificar unos pequeños ejes X/Y cerca de la esquina inferior izquierda del viewport.

9. Mover el cursor dentro del canvas y observar las coordenadas en la barra inferior.

10. Comprobar:

```text
mouse derecha → X aumenta
mouse izquierda → X disminuye
mouse arriba → Y aumenta
mouse abajo → Y disminuye
```

11. Abrir otro proyecto y comprobar que el sistema se mantiene correctamente.

12. Cerrar GeoFEM.

13. Ejecutar:

```powershell
git status
```

No hacer todavía `git add` ni `git commit` hasta revisar la prueba.

---

## 11. Resultado esperado del Git status

Aproximadamente:

```text
modified: frontend/index.html
modified: frontend/js/project-state.js

Untracked files:
    docs/SPRINT_1_PASO_2.md
    frontend/js/viewport.js
```

---

## 12. Próximo paso

Sprint 1 / Paso 3 implementará el control de cámara:

```text
zoom
+
pan
+
grid dinámico
```

sin modificar las coordenadas reales almacenadas en `projectState.geometry`.
