from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sqlite3
import os
import uuid
import shutil

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, '..', 'database', 'exporta_tradicion.db')
UPLOAD_FOLDER = os.path.join(BASE_DIR, '..', 'frontend', 'assets', 'product_images')

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=UPLOAD_FOLDER), name="static")

@app.on_event("startup")
def iniciar_base_de_datos():
    # El timeout=20 le dice a Python que sea paciente y espere si la BD está ocupada
    conexion = sqlite3.connect(DB_PATH, timeout=20)
    try:
        cursor = conexion.cursor()
        cursor.executescript("""
            CREATE TABLE IF NOT EXISTS Usuarios (
                id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                apellidos TEXT NOT NULL,
                localizacion TEXT NOT NULL,
                telefono TEXT UNIQUE NOT NULL,
                rol TEXT NOT NULL,
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS Productos (
                id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
                vendedor_finca TEXT NOT NULL,
                producto TEXT NOT NULL,
                cantidad REAL NOT NULL,
                unidad TEXT NOT NULL,
                precio REAL NOT NULL,
                ubicacion_vendedor TEXT NOT NULL,
                creador_usuario TEXT NOT NULL,
                imagen_url TEXT DEFAULT '/static/placeholder.png',
                estado TEXT DEFAULT 'activo'
            );

            CREATE TABLE IF NOT EXISTS Transacciones (
                id_transaccion INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER NOT NULL,
                vendedor_nombre TEXT NOT NULL,
                producto_nombre TEXT NOT NULL,
                precio_venta REAL NOT NULL,
                comprador_nombre TEXT NOT NULL,
                comprador_ubicacion_origen TEXT NOT NULL,
                fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)
        try:
            cursor.execute("ALTER TABLE Productos ADD COLUMN estado TEXT DEFAULT 'activo'")
        except:
            pass
        conexion.commit()
        print("✅ Base de datos SQLite inicializada (Seguridad Anti-Bloqueo Activada)")
    finally:
        # El bloque finally SIEMPRE quita el seguro de la puerta
        conexion.close()

class DatosUsuario(BaseModel):
    nombre: str
    apellido: str
    localizacion: str
    telefono: str
    rol: str

class DatosVenta(BaseModel):
    vendedor_finca: str
    producto: str
    cantidad: float
    unidad: str
    precio: float
    ubicacion_vendedor: str
    creador_usuario: str
    imagen_url: str

class DatosCompra(BaseModel):
    producto_id: int
    comprador_nombre: str
    comprador_ubicacion: str

@app.get("/")
def estado_servidor():
    return {"mensaje": "API funcionando perfectamente"}

@app.post("/api/registro")
def registrar_usuario(datos: DatosUsuario):
    conexion = None
    try:
        conexion = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conexion.cursor()
        cursor.execute("""
            INSERT INTO Usuarios (nombre, apellidos, localizacion, telefono, rol)
            VALUES (?, ?, ?, ?, ?)
        """, (datos.nombre, datos.apellido, datos.localizacion, datos.telefono, datos.rol))
        conexion.commit()
        return {"status": "success", "message": "Usuario registrado"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Este número de teléfono ya está registrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conexion:
            conexion.close()

@app.post("/api/upload-image")
def upload_image(file: UploadFile = File(...)):
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"prod_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar la imagen: {e}")
    return {"imagen_url": f"/static/{unique_filename}"}

@app.post("/api/publicar-venta")
def publicar_venta(datos: DatosVenta):
    conexion = None
    try:
        conexion = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conexion.cursor()
        cursor.execute("""
            INSERT INTO Productos (vendedor_finca, producto, cantidad, unidad, precio, ubicacion_vendedor, creador_usuario, imagen_url, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'activo')
        """, (datos.vendedor_finca, datos.producto, datos.cantidad, datos.unidad, datos.precio, datos.ubicacion_vendedor, datos.creador_usuario, datos.imagen_url))
        conexion.commit()
        return {"status": "success", "message": "Cosecha publicada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conexion:
            conexion.close()

@app.get("/api/catalogo")
def obtener_catalogo():
    conexion = None
    try:
        conexion = sqlite3.connect(DB_PATH, timeout=20)
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM Productos WHERE estado = 'activo'")
        filas = cursor.fetchall()
        return [dict(fila) for fila in filas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conexion:
            conexion.close()

@app.post("/api/registrar-compra")
def registrar_compra(datos: DatosCompra):
    conexion = None
    try:
        conexion = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM Productos WHERE id_producto = ?", (datos.producto_id,))
        producto = cursor.fetchone()
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        
        vendedor_nombre = producto[1]
        producto_nombre = producto[2]
        precio_venta = producto[5]     
        
        cursor.execute("""
            INSERT INTO Transacciones (producto_id, vendedor_nombre, producto_nombre, precio_venta, comprador_nombre, comprador_ubicacion_origen)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (datos.producto_id, vendedor_nombre, producto_nombre, precio_venta, datos.comprador_nombre, datos.comprador_ubicacion))
        conexion.commit()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conexion:
            conexion.close()

@app.delete("/api/eliminar-producto/{producto_id}")
def eliminar_producto(producto_id: int):
    conexion = None
    try:
        conexion = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conexion.cursor()
        cursor.execute("UPDATE Productos SET estado = 'eliminado' WHERE id_producto = ?", (producto_id,))
        conexion.commit()
        return {"status": "success", "message": "Producto ocultado del mercado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conexion:
            conexion.close()

@app.get("/api/admin/transacciones")
def obtener_transacciones_admin():
    conexion = None
    try:
        conexion = sqlite3.connect(DB_PATH, timeout=20)
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM Transacciones ORDER BY fecha_compra DESC")
        filas = cursor.fetchall()
        return [dict(fila) for fila in filas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conexion:
            conexion.close()

@app.get("/api/admin/productos")
def obtener_productos_admin():
    conexion = None
    try:
        conexion = sqlite3.connect(DB_PATH, timeout=20)
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM Productos ORDER BY id_producto DESC")
        filas = cursor.fetchall()
        return [dict(fila) for fila in filas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conexion:
            conexion.close()

@app.delete("/api/admin/eliminar-producto-permanente/{producto_id}")
def eliminar_producto_permanente(producto_id: int):
    conexion = None
    try:
        conexion = sqlite3.connect(DB_PATH, timeout=20)
        cursor = conexion.cursor()
        cursor.execute("DELETE FROM Productos WHERE id_producto = ?", (producto_id,))
        conexion.commit()
        return {"status": "success", "message": "Producto borrado permanentemente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conexion:
            conexion.close()
