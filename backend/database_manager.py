"""Modulo encargado de la persistencia de datos (CRUD) en MySQL para GeoFEM."""

import mysql.connector
from mysql.connector import Error

def obtener_conexion():
    """Establece la conexion con tu servidor local de MySQL."""
    try:
        conexion = mysql.connector.connect(
            host="localhost",
            user="root",          # Tu usuario de MySQL
            password="tu_password",  # PON AQUÍ TU CONTRASEÑA DE MYSQL WORKBENCH
            database="geotecnia_fem"
        )
        if conexion.is_connected():
            return conexion
    except Error as e:
        print(f"Error de conexion: {e}")
        return None

# =============================================================================
# 1. INSERCIÓN (CREATE): Guarda un nuevo proyecto en la base de datos
# =============================================================================
def insertar_proyecto(nombre: str, codigo: str, ubicacion: str) -> int:
    """Inserta un nuevo proyecto y devuelve su ID generado."""
    query = "INSERT INTO proyecto (nombre, codigo, ubicacion) VALUES (%s, %s, %s);"
    conexion = obtener_conexion()
    if not conexion: return 0
    try:
        cursor = conexion.cursor()
        cursor.execute(query, (nombre, codigo, ubicacion))
        conexion.commit() # Confirmar el guardado físico en el disco
        return cursor.lastrowid # Nos devuelve el ID numérico que MySQL le asignó
    except Error as e:
        print(f"Error al insertar: {e}")
        return 0
    finally:
        cursor.close()
        conexion.close()

# =============================================================================
# 2. CONSULTA (READ): Trae la lista de todos los proyectos guardados
# =============================================================================
def consultar_proyectos() -> list:
    """Extrae todos los proyectos de la base de datos para mostrarlos en el Dashboard."""
    query = "SELECT id, nombre, codigo, ubicacion, fecha_creacion FROM proyecto ORDER BY id DESC;"
    conexion = obtener_conexion()
    if not conexion: return []
    try:
        cursor = conexion.cursor(dictionary=True) # Trae los datos ordenados con el nombre de su columna
        cursor.execute(query)
        return cursor.fetchall() # Retorna la lista completa
    except Error as e:
        print(f"Error al consultar: {e}")
        return []
    finally:
        cursor.close()
        conexion.close()

# =============================================================================
# 3. ACTUALIZACIÓN (UPDATE): Modifica un proyecto que ya existe
# =============================================================================
def actualizar_proyecto(proyecto_id: int, nuevo_nombre: str, nueva_ubicacion: str) -> bool:
    """Modifica el nombre o ubicacion de un proyecto usando su ID."""
    query = "UPDATE proyecto SET nombre = %s, ubicacion = %s WHERE id = %s;"
    conexion = obtener_conexion()
    if not conexion: return False
    try:
        cursor = conexion.cursor()
        cursor.execute(query, (nuevo_nombre, nueva_ubicacion, proyecto_id))
        conexion.commit()
        return True
    except Error as e:
        print(f"Error al actualizar: {e}")
        return False
    finally:
        cursor.close()
        conexion.close()

# =============================================================================
# 4. ELIMINACIÓN (DELETE): Borra un proyecto del sistema
# =============================================================================
def eliminar_proyecto(proyecto_id: int) -> bool:
    """Elimina de forma fisica un proyecto de la base de datos."""
    query = "DELETE FROM proyecto WHERE id = %s;"
    conexion = obtener_conexion()
    if not conexion: return False
    try:
        cursor = conexion.cursor()
        cursor.execute(query, (proyecto_id,))
        conexion.commit()
        return True
    except Error as e:
        print(f"Error al eliminar: {e}")
        return False
    finally:
        cursor.close()
        conexion.close()
