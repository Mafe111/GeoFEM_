-- 1. CREAR Y SELECCIONAR LA BASE DE DATOS
CREATE DATABASE IF NOT EXISTS `taludes_fem`;
USE `taludes_fem`;

-- 2. CREACIÓN DE TABLAS EN ORDEN DE DEPENDENCIAS
CREATE TABLE IF NOT EXISTS `Proyecto` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `codigo` VARCHAR(50) NULL,
  `ubicacion` VARCHAR(150) NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_ultima_mod` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Configuracion_Analisis` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `proyecto_id` INT NOT NULL,
  `tipo_analisis` ENUM('SSR', 'STATIC_STRESS', 'SEEPAGE') NOT NULL DEFAULT 'SSR',
  `tolerancia` FLOAT NOT NULL DEFAULT 0.001,
  `iteraciones` INT NOT NULL DEFAULT 500,
  `kh` FLOAT NOT NULL DEFAULT 0.0,
  `kv` FLOAT NOT NULL DEFAULT 0.0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_config_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `Proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Material` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `proyecto_id` INT NOT NULL,
  `nombre` VARCHAR(50) NOT NULL,
  `modelo_constitutivo` ENUM('MOHR_COULOMB', 'ELASTIC') NOT NULL DEFAULT 'MOHR_COULOMB',
  `peso_especifico` FLOAT NOT NULL,
  `modulo_elasticidad` FLOAT NOT NULL,
  `relacion_poisson` FLOAT NOT NULL,
  `cohesion` FLOAT NOT NULL,
  `angulo_friccion` FLOAT NOT NULL,
  `angulo_dilatancia` FLOAT NOT NULL DEFAULT 0.0,
  `drenado` TINYINT(1) NOT NULL DEFAULT 1,
  `color_visual` VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_material_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `Proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Capa_Suelo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `material_id` INT NOT NULL,
  `nombre_capa` VARCHAR(50) NULL,
  `ruta_archivo_geometria` VARCHAR(255) NOT NULL,
  `profundidad_inicio` FLOAT NULL,
  `profundidad_fin` FLOAT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_capa_material` FOREIGN KEY (`material_id`) REFERENCES `Material` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Malla` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `proyecto_id` INT NOT NULL,
  `tipo_elemento` ENUM('T3', 'T6', 'Q4') NOT NULL DEFAULT 'T3',
  `densidad_malla` INT NOT NULL DEFAULT 3,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_malla_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `Proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Nodo` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `malla_id` INT NOT NULL,
  `numero_nodo` INT NOT NULL,
  `x` FLOAT NOT NULL,
  `y` FLOAT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_malla_nodo` (`malla_id`, `numero_nodo`),
  CONSTRAINT `fk_nodo_malla` FOREIGN KEY (`malla_id`) REFERENCES `Malla` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Elemento` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `malla_id` INT NOT NULL,
  `material_id` INT NOT NULL,
  `numero_elemento` INT NOT NULL,
  `nodo_1` INT NOT NULL,
  `nodo_2` INT NOT NULL,
  `nodo_3` INT NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_elemento_malla` FOREIGN KEY (`malla_id`) REFERENCES `Malla` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_elemento_material` FOREIGN KEY (`material_id`) REFERENCES `Material` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_elemento_nodo1` FOREIGN KEY (`nodo_1`) REFERENCES `Nodo` (`id`),
  CONSTRAINT `fk_elemento_nodo2` FOREIGN KEY (`nodo_2`) REFERENCES `Nodo` (`id`),
  CONSTRAINT `fk_elemento_nodo3` FOREIGN KEY (`nodo_3`) REFERENCES `Nodo` (`id`)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Condicion_Frontera` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nodo_id` INT NOT NULL,
  `fijo_x` TINYINT(1) NOT NULL DEFAULT 0,
  `fijo_y` TINYINT(1) NOT NULL DEFAULT 0,
  `carga_punto_x` FLOAT NOT NULL DEFAULT 0.0,
  `carga_punto_y` FLOAT NOT NULL DEFAULT 0.0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_frontera_nodo` FOREIGN KEY (`nodo_id`) REFERENCES `Nodo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Resultado` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `proyecto_id` INT NOT NULL,
  `factor_seguridad` FLOAT NULL,
  `ruta_archivo_desplazamientos` VARCHAR(255) NOT NULL,
  `ruta_archivo_tensiones` VARCHAR(255) NOT NULL,
  `convergio` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_resultado_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `Proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `Informe` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `proyecto_id` INT NOT NULL,
  `nombre_archivo_pdf` VARCHAR(255) NOT NULL,
  `incluye_geometria` TINYINT(1) NOT NULL DEFAULT 1,
  `incluye_resultados` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_informe_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `Proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;
