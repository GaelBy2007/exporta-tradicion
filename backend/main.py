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
SQL_PATH = os.path.join(BASE_DIR, '..', 'database', 'esquema.sql')
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
    conexion = sqlite3.connect(DB_PATH)
    cursor = conexion.cursor()
    
    # Borramos tablas viejas para aplicar el nuevo diseño de Roles
    cursor.executescript("""
        DROP TABLE IF EXISTS Productores;
        DROP TABLE IF EXISTS Usuarios;
        DROP TABLE IF EXISTS Productos;
        DROP TABLE IF EXISTS Transacciones;
    """)

    cursor.executescript("""
        CREATE TABLE Usuarios (
            id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellidos TEXT NOT NULL,
            localizacion TEXT NOT NULL,
            telefono TEXT UNIQUE NOT NULL,
            rol TEXT NOT NULL, -- AQUÍ SE GUARDA SI ES COMPRADOR O VENDEDOR
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE Productos (
            id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
            vendedor_finca TEXT NOT NULL,
            producto TEXT NOT NULL,
            cantidad REAL NOT NULL,
            unidad TEXT NOT NULL,
            precio REAL NOT NULL,
            ubicacion_vendedor TEXT NOT NULL,
            creador_usuario TEXT NOT NULL,
            imagen_url TEXT DEFAULT '/static/placeholder.png'
        );

        CREATE TABLE Transacciones (
            id_transaccion INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id INTEGER NOT NULL,
            vendedor_nombre TEXT NOT NULL,
            producto_nombre TEXT NOT NULL,
            precio_venta REAL NOT NULL,
            comprador_nombre TEXT NOT NULL,
            comprador_ubicacion_origen TEXT NOT NULL,
            fecha_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (producto_id) REFERENCES Productos(id_producto)
        );
    """)
    conexion.commit()
    conexion.close()
    print("✅ Base de datos SQLite inicializada con Perfiles Separados (Comprador/Vendedor)")

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
    return {"mensaje": "API funcionando"}

@app.post("/api/registro")
def registrar_usuario(datos: DatosUsuario):
    try:
        conexion = sqlite3.connect(DB_PATH)
        cursor = conexion.cursor()
        cursor.execute("""
            INSERT INTO Usuarios (nombre, apellidos, localizacion, telefono, rol)
            VALUES (?, ?, ?, ?, ?)
        """, (datos.nombre, datos.apellido, datos.localizacion, datos.telefono, datos.rol))
        conexion.commit()
        conexion.close()
        return {"status": "success", "message": "Usuario registrado"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Este teléfono ya está registrado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    try:
        conexion = sqlite3.connect(DB_PATH)
        cursor = conexion.cursor()
        cursor.execute("""
            INSERT INTO Productos (vendedor_finca, producto, cantidad, unidad, precio, ubicacion_vendedor, creador_usuario, imagen_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (datos.vendedor_finca, datos.producto, datos.cantidad, datos.unidad, datos.precio, datos.ubicacion_vendedor, datos.creador_usuario, datos.imagen_url))
        conexion.commit()
        conexion.close()
        return {"status": "success", "message": "Cosecha publicada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/catalogo")
def obtener_catalogo():
    try:
        conexion = sqlite3.connect(DB_PATH)
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM Productos")
        filas = cursor.fetchall()
        conexion.close()
        return [dict(fila) for fila in filas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/registrar-compra")
def registrar_compra(datos: DatosCompra):
    try:
        conexion = sqlite3.connect(DB_PATH)
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
        conexion.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/transacciones")
def obtener_transacciones_admin():
    try:
        conexion = sqlite3.connect(DB_PATH)
        conexion.row_factory = sqlite3.Row
        cursor = conexion.cursor()
        cursor.execute("SELECT * FROM Transacciones ORDER BY fecha_compra DESC")
        filas = cursor.fetchall()
        conexion.close()
        return [dict(fila) for fila in filas]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        