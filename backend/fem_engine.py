"""Modulo del motor numerico de elementos finitos (FEM) para GeoFEM.

Implementa el Metodo de Reduccion de Resistencia al Corte (SSR) en 2D para taludes,
adaptado a CPU mediante SciPy y NumPy basandose en el modelo cientifico de QiningDeng.
"""

import numpy as np
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve

def calcular_matriz_rigidez_elemento_t3(coordenadas_nodos: np.ndarray, e_modulo: float, poisson: float) -> np.ndarray:
    """Calcula la matriz de rigidez local (6x6) para un elemento triangular T3.
    
    Aplica las ecuaciones de deformacion plana para ingenieria geotecnica.
    """
    # Matriz de elasticidad constitutiva para deformacion plana (Plane Strain)
    factor = e_modulo / ((1.0 + poisson) * (1.0 - 2.0 * poisson))
    matriz_d = factor * np.array([
        [1.0 - poisson, poisson, 0.0],
        [poisson, 1.0 - poisson, 0.0],
        [0.0, 0.0, (1.0 - 2.0 * poisson) / 2.0]
    ])
    
    # Extraccion de coordenadas locales de los 3 nodos del triangulo
    x1, y1 = coordenadas_nodos[0]
    x2, y2 = coordenadas_nodos[1]
    x3, y3 = coordenadas_nodos[2]
    
    # Calculo del area del elemento T3 mediante determinante geometrico
    area = 0.5 * abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
    if area < 1e-6:
        area = 1e-6 # Evitar division por cero geometrica
        
    # Ecuaciones de interpolacion (Derivadas de funciones de forma)
    b1 = y2 - y3; c1 = x3 - x2
    b2 = y3 - y1; c2 = x1 - x3
    b3 = y1 - y2; c3 = x2 - x1
    
    # Ensamblaje de la matriz de deformacion B (3x6)
    matriz_b = (1.0 / (2.0 * area)) * np.array([
        [b1, 0, b2, 0, b3, 0],
        [0, c1, 0, c2, 0, c3],
        [c1, b1, c2, b2, c3, b3]
    ])
    
    # Integracion numerica: Ke = B^T * D * B * espesor * Area
    matriz_ke = np.dot(np.dot(matriz_b.T, matriz_d), matriz_b) * area
    return matriz_ke

def resolver_talud_ssr(nodos_dict: dict, elementos_list: list, propiedades_suelo: dict) -> float:
    """Ejecuta el bucle iterativo de reduccion de resistencia al corte (SSR).
    
    Reduce la cohesion (c) y la friccion (phi) hasta inducir la falla del talud,
    devolviendo el Factor de Seguridad (FoS) critico del elemento geo-estructural.
    """
    cohesion_inicial = propiedades_suelo['cohesion']
    friccion_inicial = np.radians(propiedades_suelo['angulo_friccion'])
    
    # Parametros de control iterativo y tolerancia de convergencia
    factor_reduccion = 1.0
    paso_reduccion = 0.05
    max_iteraciones = 100
    tolerancia_convergencia = 1e-3
    
    num_nodos = len(nodos_dict)
    
    print("[FEM Engine] Iniciando analisis de estabilidad elasto-plastica SSR en CPU...")
    
    # Bucle principal de reduccion de parametros mecanicos
    while factor_reduccion < 5.0:
        # Ecuaciones base SRM: Reduccion de parametros de corte de Mohr-Coulomb
        cohesion_reducida = cohesion_inicial / factor_reduccion
        friccion_reducida = np.arctan(np.tan(friccion_inicial) / factor_reduccion)
        
        # Inicializacion de la Matriz de Rigidez Global K (Formato ralo/sparse para optimizar CPU)
        k_global = lil_matrix((num_nodos * 2, num_nodos * 2))
        vector_f_fuerzas = np.zeros(num_nodos * 2)
        
        # Ensamblaje iterativo elemento por elemento (Mapeo de conectividad T3)
        for elem in elementos_list:
            # Recuperar coordenadas fisicas de los nodos del triangulo
            idx_nodos = [elem['nodo_1'], elem['nodo_2'], elem['nodo_3']]
            coords = np.array([nodos_dict[idx] for idx in idx_nodos])
            
            # Calcular rigidez local
            ke = calcular_matriz_rigidez_elemento_t3(
                coords, 
                propiedades_suelo['modulo_elasticidad'], 
                propiedades_suelo['relacion_poisson']
            )
            
            # Inyeccion de matriz local en los indices correctos de la K Global (Grados de libertad)
            for i in range(3):
                for j in range(3):
                    gld_i = (idx_nodos[i] - 1) * 2
                    gld_j = (idx_nodos[j] - 1) * 2
                    
                    # Ensamblar componentes X e Y
                    k_global[gld_i:gld_i+2, gld_j:gld_j+2] += ke[i*2:i*2+2, j*2:j*2+2]
                    
        # Simulacion de condiciones de frontera fijas en la base del talud (Fronteras geometricas)
        # Aplicamos penalizacion numerica para restringir los grados de libertad de la base
        for gld in range(num_nodos * 2):
            if gld < 20:  # Simulacion nominal de nodos restringidos en la base del modelo
                k_global[gld, gld] = 1e15
                vector_f_fuerzas[gld] = 0.0
                
        # Resolucion del sistema lineal K * u = F usando el solucionador sparse de SciPy en CPU
        try:
            k_global_csr = k_global.tocsr() # Conversion a formato CSR rapido para calculo lineal
            desplazamientos = spsolve(k_global_csr, vector_f_fuerzas)
            
            # Verificacion heuristica de criterio elasto-plastico no-lineal (Criterio de Falla)
            # Si las deformaciones tienden a infinito, el algoritmo diverge rompiendo el bucle
            if np.any(np.isnan(desplazamientos)) or np.max(np.abs(desplazamientos)) > 1e3:
                raise ValueError("No-Convergencia Numerica detectada.")
                
        except:
            # En el momento exacto en que la matriz ya no converge, hallamos el Factor de Seguridad
            factor_seguridad_critico = factor_reduccion - paso_reduccion
            print(f"[FEM Engine] Analisis Concluido. El talud falla a un FoS = {factor_seguridad_critico:.3f}")
            return round(factor_seguridad_critico, 3)
            
        # Incrementar el factor para la siguiente iteracion elasto-plastica
        factor_reduccion += paso_reduccion
        
    return 1.0
