-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: taludes_fem
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `capa_suelo`
--

DROP TABLE IF EXISTS `capa_suelo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `capa_suelo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` int NOT NULL,
  `nombre_capa` varchar(50) DEFAULT NULL,
  `ruta_archivo_geometria` varchar(255) NOT NULL,
  `profundidad_inicio` double DEFAULT NULL,
  `profundidad_fin` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_capa_material` (`material_id`),
  CONSTRAINT `fk_capa_material` FOREIGN KEY (`material_id`) REFERENCES `material` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `capa_suelo`
--

LOCK TABLES `capa_suelo` WRITE;
/*!40000 ALTER TABLE `capa_suelo` DISABLE KEYS */;
INSERT INTO `capa_suelo` VALUES (1,1,'Estrato Principal','/data/geometries/layer_01.json',0,15);
/*!40000 ALTER TABLE `capa_suelo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `condicion_frontera`
--

DROP TABLE IF EXISTS `condicion_frontera`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `condicion_frontera` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nodo_id` bigint NOT NULL,
  `fijo_x` tinyint(1) NOT NULL DEFAULT '0',
  `fijo_y` tinyint(1) NOT NULL DEFAULT '0',
  `carga_punto_x` float NOT NULL DEFAULT '0',
  `carga_punto_y` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_frontera_nodo` (`nodo_id`),
  CONSTRAINT `fk_frontera_nodo` FOREIGN KEY (`nodo_id`) REFERENCES `nodo` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `condicion_frontera`
--

LOCK TABLES `condicion_frontera` WRITE;
/*!40000 ALTER TABLE `condicion_frontera` DISABLE KEYS */;
INSERT INTO `condicion_frontera` VALUES (1,1,1,1,0,0),(2,2,1,1,0,0);
/*!40000 ALTER TABLE `condicion_frontera` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_analisis`
--

DROP TABLE IF EXISTS `configuracion_analisis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_analisis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `tipo_analisis` enum('SSR','STATIC_STRESS','SEEPAGE') NOT NULL DEFAULT 'SSR',
  `tolerancia` double DEFAULT '0.001',
  `iteraciones` int NOT NULL DEFAULT '500',
  `kh` float NOT NULL DEFAULT '0',
  `kv` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_config_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_config_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_analisis`
--

LOCK TABLES `configuracion_analisis` WRITE;
/*!40000 ALTER TABLE `configuracion_analisis` DISABLE KEYS */;
INSERT INTO `configuracion_analisis` VALUES (1,1,'SSR',0.0010000000474974513,500,0,0);
/*!40000 ALTER TABLE `configuracion_analisis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `elemento`
--

DROP TABLE IF EXISTS `elemento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `elemento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `malla_id` int NOT NULL,
  `material_id` int NOT NULL,
  `numero_elemento` int NOT NULL,
  `nodo_1` bigint NOT NULL,
  `nodo_2` bigint NOT NULL,
  `nodo_3` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_elemento_malla` (`malla_id`),
  KEY `fk_elemento_material` (`material_id`),
  KEY `fk_elemento_nodo1` (`nodo_1`),
  KEY `fk_elemento_nodo2` (`nodo_2`),
  KEY `fk_elemento_nodo3` (`nodo_3`),
  CONSTRAINT `fk_elemento_malla` FOREIGN KEY (`malla_id`) REFERENCES `malla` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_elemento_material` FOREIGN KEY (`material_id`) REFERENCES `material` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_elemento_nodo1` FOREIGN KEY (`nodo_1`) REFERENCES `nodo` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_elemento_nodo2` FOREIGN KEY (`nodo_2`) REFERENCES `nodo` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_elemento_nodo3` FOREIGN KEY (`nodo_3`) REFERENCES `nodo` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `elemento`
--

LOCK TABLES `elemento` WRITE;
/*!40000 ALTER TABLE `elemento` DISABLE KEYS */;
INSERT INTO `elemento` VALUES (1,1,1,0,1,2,3);
/*!40000 ALTER TABLE `elemento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `informe`
--

DROP TABLE IF EXISTS `informe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `informe` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `nombre_archivo_pdf` varchar(255) NOT NULL,
  `incluye_geometria` tinyint(1) NOT NULL DEFAULT '1',
  `incluye_resultados` tinyint(1) NOT NULL DEFAULT '1',
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_informe_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_informe_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `informe`
--

LOCK TABLES `informe` WRITE;
/*!40000 ALTER TABLE `informe` DISABLE KEYS */;
INSERT INTO `informe` VALUES (1,1,'Reporte_Estabilidad_FaseI.pdf',1,1,'2026-05-18 20:04:12');
/*!40000 ALTER TABLE `informe` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `malla`
--

DROP TABLE IF EXISTS `malla`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `malla` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `tipo_elemento` enum('T3','T6','Q4') NOT NULL DEFAULT 'T3',
  `densidad_malla` int NOT NULL DEFAULT '3',
  PRIMARY KEY (`id`),
  KEY `fk_malla_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_malla_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `malla`
--

LOCK TABLES `malla` WRITE;
/*!40000 ALTER TABLE `malla` DISABLE KEYS */;
INSERT INTO `malla` VALUES (1,1,'T3',3);
/*!40000 ALTER TABLE `malla` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material`
--

DROP TABLE IF EXISTS `material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `modelo_constitutivo` enum('MOHR_COULOMB','ELASTIC') NOT NULL DEFAULT 'MOHR_COULOMB',
  `peso_especifico` double NOT NULL,
  `modulo_elasticidad` double NOT NULL,
  `relacion_poisson` double NOT NULL,
  `cohesion` double NOT NULL,
  `angulo_friccion` double NOT NULL,
  `angulo_dilatancia` double DEFAULT '0',
  `drenado` tinyint(1) NOT NULL DEFAULT '1',
  `color_visual` varchar(7) NOT NULL DEFAULT '#FFFFFF',
  PRIMARY KEY (`id`),
  KEY `fk_material_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_material_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material`
--

LOCK TABLES `material` WRITE;
/*!40000 ALTER TABLE `material` DISABLE KEYS */;
INSERT INTO `material` VALUES (1,1,'Arcilla Competente','MOHR_COULOMB',19.5,30000,0.30000001192092896,25,28,0,1,'#2ECC71');
/*!40000 ALTER TABLE `material` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nodo`
--

DROP TABLE IF EXISTS `nodo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nodo` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `malla_id` int NOT NULL,
  `numero_nodo` int NOT NULL,
  `x` double NOT NULL,
  `y` double NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_malla_nodo` (`malla_id`,`numero_nodo`),
  CONSTRAINT `fk_nodo_malla` FOREIGN KEY (`malla_id`) REFERENCES `malla` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nodo`
--

LOCK TABLES `nodo` WRITE;
/*!40000 ALTER TABLE `nodo` DISABLE KEYS */;
INSERT INTO `nodo` VALUES (1,1,0,0,0),(2,1,1,10,0),(3,1,2,5,8.5);
/*!40000 ALTER TABLE `nodo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proyecto`
--

DROP TABLE IF EXISTS `proyecto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proyecto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `ubicacion` varchar(150) DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_ultima_mod` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proyecto`
--

LOCK TABLES `proyecto` WRITE;
/*!40000 ALTER TABLE `proyecto` DISABLE KEYS */;
INSERT INTO `proyecto` VALUES (1,'Talud de Diseño - Fase I','TAL-FEM-001','Zona Andina - Sector A','2026-05-18 20:04:12','2026-05-18 20:04:12');
/*!40000 ALTER TABLE `proyecto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `resultado`
--

DROP TABLE IF EXISTS `resultado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `resultado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `factor_seguridad` float DEFAULT NULL,
  `ruta_archivo_desplazamientos` varchar(255) NOT NULL,
  `ruta_archivo_tensiones` varchar(255) NOT NULL,
  `convergio` tinyint(1) NOT NULL DEFAULT '1',
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_resultado_proyecto` (`proyecto_id`),
  CONSTRAINT `fk_resultado_proyecto` FOREIGN KEY (`proyecto_id`) REFERENCES `proyecto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `resultado`
--

LOCK TABLES `resultado` WRITE;
/*!40000 ALTER TABLE `resultado` DISABLE KEYS */;
INSERT INTO `resultado` VALUES (1,1,1.34,'/data/outputs/disp_001.bin','/data/outputs/stress_001.bin',1,'2026-05-18 20:04:12');
/*!40000 ALTER TABLE `resultado` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-28  6:05:37
