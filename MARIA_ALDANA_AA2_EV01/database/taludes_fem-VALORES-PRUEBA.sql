USE `taludes_fem`;

-- 1. LIMPIEZA DE TABLAS ANTERIORES (Para evitar duplicados)
-- Desactivamos temporalmente las llaves foráneas para poder vaciar las tablas sin errores
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `Condicion_Frontera`;
TRUNCATE TABLE `Elemento`;
TRUNCATE TABLE `Nodo`;
TRUNCATE TABLE `Malla`;
TRUNCATE TABLE `Capa_Suelo`;
TRUNCATE TABLE `Material`;
TRUNCATE TABLE `Configuracion_Analisis`;
TRUNCATE TABLE `Resultado`;
TRUNCATE TABLE `Informe`;
TRUNCATE TABLE `Proyecto`;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. INSERCIÓN DE DATOS SIMULADOS
-- Insertar el Proyecto raíz
INSERT INTO `Proyecto` (`nombre`, `codigo`, `ubicacion`) 
VALUES ('Talud de Diseño - Fase I', 'TAL-FEM-001', 'Zona Andina - Sector A');

-- Insertar la Configuración de Análisis (Buscando Factor de Seguridad con SSR)
INSERT INTO `Configuracion_Analisis` (`proyecto_id`, `tipo_analisis`, `tolerancia`, `iteraciones`, `kh`, `kv`) 
VALUES (LAST_INSERT_ID(), 'SSR', 0.001, 500, 0.0, 0.0);

-- Insertar el Material (Suelo tipo Arcilla Competente con Mohr-Coulomb)
INSERT INTO `Material` (`proyecto_id`, `nombre`, `modelo_constitutivo`, `peso_especifico`, `modulo_elasticidad`, `relacion_poisson`, `cohesion`, `angulo_friccion`, `angulo_dilatancia`, `drenado`, `color_visual`) 
VALUES (1, 'Arcilla Competente', 'MOHR_COULOMB', 19.5, 30000.0, 0.30, 25.0, 28.0, 0.0, 1, '#2ECC71');

-- Insertar la Capa del Suelo asociada a la geometría
INSERT INTO `Capa_Suelo` (`material_id`, `nombre_capa`, `ruta_archivo_geometria`, `profundidad_inicio`, `profundidad_fin`) 
VALUES (1, 'Estrato Principal', '/data/geometries/layer_01.json', 0.0, 15.0);

-- Crear la Malla numérica de control
INSERT INTO `Malla` (`proyecto_id`, `tipo_elemento`, `densidad_malla`) 
VALUES (1, 'T3', 3);

-- Insertar los Nodos sin forzar el 'id' primario (MySQL usará 1, 2, 3 automáticamente por el AUTO_INCREMENT)
INSERT INTO `Nodo` (`malla_id`, `numero_nodo`, `x`, `y`) VALUES 
(1, 0, 0.0, 0.0),    -- Nodo base izquierdo
(1, 1, 10.0, 0.0),   -- Nodo base derecho
(1, 2, 5.0, 8.5);    -- Nodo cresta del triángulo

-- Insertar el Elemento conectado a esos 3 nodos en sentido antihorario
INSERT INTO `Elemento` (`malla_id`, `material_id`, `numero_elemento`, `nodo_1`, `nodo_2`, `nodo_3`) 
VALUES (1, 1, 0, 1, 2, 3);

-- Aplicar Condiciones de Frontera (Fijar la base del triángulo para que no se mueva)
INSERT INTO `Condicion_Frontera` (`nodo_id`, `fijo_x`, `fijo_y`, `carga_punto_x`, `carga_punto_y`) VALUES 
(1, 1, 1, 0.0, 0.0), -- Nodo 1 completamente empotrado
(2, 1, 1, 0.0, 0.0); -- Nodo 2 completamente empotrado

-- Registrar un Resultado simulado del motor de cálculo FEM
INSERT INTO `Resultado` (`proyecto_id`, `factor_seguridad`, `ruta_archivo_desplazamientos`, `ruta_archivo_tensiones`, `convergio`) 
VALUES (1, 1.34, '/data/outputs/disp_001.bin', '/data/outputs/stress_001.bin', 1);

-- Registrar el Informe generado
INSERT INTO `Informe` (`proyecto_id`, `nombre_archivo_pdf`, `incluye_geometria`, `incluye_resultados`) 
VALUES (1, 'Reporte_Estabilidad_FaseI.pdf', 1, 1);
