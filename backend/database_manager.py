"""Persistencia MySQL de GeoFEM.

Durante el Sprint 0 este módulo mantiene el CRUD de proyectos. Más adelante se
convertirá en una capa Repository para desacoplar GeoFEM de una base de datos
específica.
"""

import mysql.connector
from mysql.connector import Error


DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "1234",
    "database": "taludes_fem",
}


def obtener_conexion():
    """Abre y devuelve una conexión MySQL, o ``None`` si falla."""
    try:
        conexion = mysql.connector.connect(**DB_CONFIG)
        if conexion.is_connected():
            return conexion
    except Error as error:
        print(f"[Database] Error de conexión: {error}")

    return None


def insertar_proyecto(nombre: str, codigo: str, ubicacion: str) -> int:
    """Inserta un proyecto y devuelve el ID autogenerado por MySQL."""
    query = (
        "INSERT INTO Proyecto (nombre, codigo, ubicacion) "
        "VALUES (%s, %s, %s);"
    )
    conexion = obtener_conexion()
    cursor = None

    if conexion is None:
        return 0

    try:
        cursor = conexion.cursor()
        cursor.execute(query, (nombre, codigo, ubicacion))
        conexion.commit()
        return int(cursor.lastrowid)
    except Error as error:
        conexion.rollback()
        print(f"[Database] Error al insertar proyecto: {error}")
        return 0
    finally:
        if cursor is not None:
            cursor.close()
        if conexion.is_connected():
            conexion.close()


def consultar_proyectos() -> list[dict] | None:
    """Devuelve los proyectos o ``None`` si ocurre un error de base de datos.

    La diferencia entre ``[]`` y ``None`` es intencional:

    - ``[]`` significa que la consulta funcionó, pero todavía no hay proyectos.
    - ``None`` significa que MySQL no pudo atender la consulta.

    Esta distinción permite que el Dashboard muestre un estado vacío real sin
    confundirlo con un fallo de conexión.
    """
    query = (
        "SELECT id, nombre, codigo, ubicacion, fecha_creacion, fecha_ultima_mod "
        "FROM Proyecto ORDER BY fecha_ultima_mod DESC, id DESC;"
    )
    conexion = obtener_conexion()
    cursor = None

    if conexion is None:
        return None

    try:
        cursor = conexion.cursor(dictionary=True)
        cursor.execute(query)
        return cursor.fetchall()
    except Error as error:
        print(f"[Database] Error al consultar proyectos: {error}")
        return None
    finally:
        if cursor is not None:
            cursor.close()
        if conexion.is_connected():
            conexion.close()


def actualizar_proyecto(
    proyecto_id: int,
    nuevo_nombre: str,
    nueva_ubicacion: str,
) -> bool:
    """Actualiza el nombre y la ubicación de un proyecto existente."""
    query = (
        "UPDATE Proyecto SET nombre = %s, ubicacion = %s "
        "WHERE id = %s;"
    )
    conexion = obtener_conexion()
    cursor = None

    if conexion is None:
        return False

    try:
        cursor = conexion.cursor()
        cursor.execute(query, (nuevo_nombre, nueva_ubicacion, proyecto_id))
        conexion.commit()
        return cursor.rowcount > 0
    except Error as error:
        conexion.rollback()
        print(f"[Database] Error al actualizar proyecto: {error}")
        return False
    finally:
        if cursor is not None:
            cursor.close()
        if conexion.is_connected():
            conexion.close()


def eliminar_proyecto(proyecto_id: int) -> bool:
    """Elimina un proyecto de la base de datos usando su ID."""
    query = "DELETE FROM Proyecto WHERE id = %s;"
    conexion = obtener_conexion()
    cursor = None

    if conexion is None:
        return False

    try:
        cursor = conexion.cursor()
        cursor.execute(query, (proyecto_id,))
        conexion.commit()
        return cursor.rowcount > 0
    except Error as error:
        conexion.rollback()
        print(f"[Database] Error al eliminar proyecto: {error}")
        return False
    finally:
        if cursor is not None:
            cursor.close()
        if conexion.is_connected():
            conexion.close()
