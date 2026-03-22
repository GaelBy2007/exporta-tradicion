// --- 1. LÓGICA MATEMÁTICA Y GRÁFICAS ---

function updateLimit(val) {
    document.getElementById('limitVal').innerText = "$" + val;
    const status = document.getElementById('limitStatus');
    status.innerText = val >= 50 ? "ESTADO: SEGURO" : "ESTADO: RIESGO";
    status.style.color = val >= 50 ? "var(--primary)" : "red";
    drawLimitChart(val);
}

function drawLimitChart(val) {
    const canvas = document.getElementById('limitCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, h - 50);
    ctx.lineTo(w, h - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = val >= 50 ? '#16a34a' : '#ef4444';
    ctx.fillRect(w/2 - 25, h - val, 50, val);
}

function updateDeriv(val) {
    document.getElementById('derivVal').innerText = val + "%";
    const status = document.getElementById('derivStatus');
    status.innerText = val > 70 ? "ALTA DEMANDA" : "ESTABLE";
    status.style.color = val > 70 ? "var(--accent)" : "var(--secondary)";
    drawDerivChart(val);
}

function drawDerivChart(val) {
    const canvas = document.getElementById('derivCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.moveTo(0, h);
    let controlY = h - (val * 1.5);
    ctx.quadraticCurveTo(w/2, controlY, w, h - (val * 0.8));
    ctx.stroke();
}

function sincronizarOpt(val) {
    let numericVal = parseFloat(val);
    if (isNaN(numericVal) || numericVal < 0) numericVal = 0;
    if (numericVal > 1000) numericVal = 1000;
    document.getElementById('optRange').value = numericVal;
    const inputNum = document.getElementById('optInput');
    if (parseFloat(inputNum.value) !== numericVal) {
        inputNum.value = numericVal;
    }
    updateOpt(numericVal);
}

function updateOpt(numericVal) {
    const status = document.getElementById('optStatus');
    let ganancia = (-0.05 * Math.pow(numericVal, 2)) + (50 * numericVal);
    if (ganancia < 0) ganancia = 0;
    status.innerText = "Beneficio Estimado: $" + Math.floor(ganancia).toLocaleString('es-MX');
    if (numericVal >= 400 && numericVal <= 600) {
        status.style.color = "var(--accent, #f59e0b)";
    } else {
        status.style.color = "var(--secondary, #3b82f6)";
    }
    drawOptChart(numericVal); 
}

function drawOptChart(val) {
    const canvas = document.getElementById('optCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    for(let x = 0; x <= w; x++) {
        let sliderValX = x * (1000 / w);
        let y = h - (((-0.05 * Math.pow(sliderValX, 2)) + (50 * sliderValX)) * (h / 12500)); 
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    let currentX = (val / 1000) * w;
    let currentY = h - (((-0.05 * Math.pow(val, 2)) + (50 * val)) * (h / 12500));
    ctx.beginPath();
    ctx.fillStyle = 'var(--accent, #f59e0b)';
    ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
    ctx.fill();
}

// --- 2. NAVEGACIÓN Y VARIABLES GLOBALES ---

let mapaGlobal = null;
let marcadoresMapa = null;

function navegar(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const vista = document.getElementById(id);
    if(vista) {
        vista.classList.add('active');
        window.scrollTo(0,0);
    }

    localStorage.setItem('pestana_actual', id);
    const userSession = JSON.parse(localStorage.getItem('sesion_exporta'));

    if(id === 'vista-registro-venta') {
        if(!userSession) {
            alert("🔒 Para registrar y vender una cosecha, primero debes crear tu cuenta en la pestaña 'Registro'.");
            navegar('vista-registro');
            return;
        }
    }

    if(id === 'vista-tienda') {
        renderizarCatalogoDB();
        setTimeout(() => { if (mapaGlobal) mapaGlobal.invalidateSize(); }, 300);
    }
    
    if(id === 'vista-admin') verificarEstadoAdmin();

    if(localStorage.getItem('lector_voz') === 'true') {
        window.speechSynthesis.cancel();
        const texto = vista ? vista.innerText.substring(0, 350) : ""; 
        const speech = new SpeechSynthesisUtterance(texto);
        speech.lang = 'es-MX';
        window.speechSynthesis.speak(speech);
    }
}

function cerrarModalSiFuera(event) {
    if (event.target === document.getElementById('modalPago')) {
        document.getElementById('modalPago').style.display = 'none';
    }
}

// --- 3. BASE DE DATOS REAL Y REGISTROS ---

const API_BASE = "https://exporta-tradicion.onrender.com";

async function guardarRegistroGeneral(e) {
    e.preventDefault();
    const datos = {
        nombre: document.getElementById('reg-nombre').value,
        apellido: document.getElementById('reg-apellido').value,
        localizacion: document.getElementById('reg-localizacion').value,
        telefono: document.getElementById('reg-telefono').value,
        rol: "universal" 
    };

    try {
        const response = await fetch(`${API_BASE}/api/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            localStorage.setItem('sesion_exporta', JSON.stringify(datos));
            cargarAjustes(); 
            navegar('vista-tienda');
            alert("¡Cuenta creada! Ya puedes comprar en el mercado o ir a la pestaña 'Vender' para publicar tus productos.");
        } else {
            const result = await response.json();
            alert("Error: " + result.detail);
        }
    } catch (error) {
        alert("Error de conexión con el servidor. Intenta de nuevo en unos segundos.");
    }
}

async function guardarRegistroVenta(e) {
    e.preventDefault();
    const userSession = JSON.parse(localStorage.getItem('sesion_exporta'));
    
    const fileInput = document.getElementById('ven-imagen');
    const file = fileInput.files[0];
    let imagenFinalUrl = "/static/placeholder.png";

    if(file) {
        const formData = new FormData();
        formData.append("file", file);
        try {
            const uploadResponse = await fetch(`${API_BASE}/api/upload-image`, { method: 'POST', body: formData });
            if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                imagenFinalUrl = uploadResult.imagen_url;
            }
        } catch (error) {
            console.error("Error subiendo imagen");
        }
    }

    const datos = {
        vendedor_finca: document.getElementById('ven-nombre').value,
        producto: document.getElementById('ven-producto').value,
        cantidad: parseFloat(document.getElementById('ven-cantidad').value),
        unidad: document.getElementById('ven-unidad').value,
        precio: parseFloat(document.getElementById('ven-precio').value),
        ubicacion_vendedor: userSession.localizacion, 
        creador_usuario: userSession.telefono,
        imagen_url: imagenFinalUrl
    };

    try {
        const response = await fetch(`${API_BASE}/api/publicar-venta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        if (response.ok) {
            alert("¡Cosecha publicada con éxito en el Mercado Oficial!");
            e.target.reset();
            navegar('vista-tienda');
        } else {
            alert("Error al guardar en base de datos oficial.");
        }
    } catch (error) {
        alert("Error de conexión con el servidor.");
    }
}

function actualizarMapa(productos) {
    if (!mapaGlobal) {
        mapaGlobal = L.map('mapa-mercado').setView([14.903, -92.262], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapaGlobal);
        marcadoresMapa = L.layerGroup().addTo(mapaGlobal);
    }
    
    marcadoresMapa.clearLayers();

    productos.forEach(async (item) => {
        try {
            let queryTexto = encodeURIComponent(item.ubicacion_vendedor + ", Chiapas, Mexico");
            let respuesta = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${queryTexto}`);
            let datosGeolocalizacion = await respuesta.json();
            
            if(datosGeolocalizacion.length > 0) {
                let lat = datosGeolocalizacion[0].lat;
                let lon = datosGeolocalizacion[0].lon;
                
                let pin = L.marker([lat, lon]).addTo(marcadoresMapa);
                
                const img = item.imagen_url.startsWith('http') ? item.imagen_url : `${API_BASE}${item.imagen_url}`;
                pin.bindPopup(`
                    <div style="text-align:center;">
                        <strong>${item.vendedor_finca}</strong><br>
                        <img src="${img}" style="width:40px; height:40px; border-radius:5px; margin:5px 0;"><br>
                        Vende <b>${item.producto}</b><br>
                        $${item.precio} / ${item.unidad}
                    </div>
                `);
            }
        } catch(e) {
            console.log("No se pudo ubicar:", item.ubicacion_vendedor);
        }
    });
}

// ELIMINAR (Soft Delete del Vendedor)
async function eliminarProducto(productoId) {
    if(confirm("¿Deseas ocultar y retirar este producto del Mercado Público? \n\n(Quedará el registro en el panel de administrador).")) {
        try {
            const response = await fetch(`${API_BASE}/api/eliminar-producto/${productoId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                alert("🗑️ Producto retirado exitosamente del mercado.");
                renderizarCatalogoDB(); 
            } else {
                alert("Error al intentar ocultar el producto.");
            }
        } catch (error) {
            alert("Error de conexión con el servidor.");
        }
    }
}

async function renderizarCatalogoDB() {
    const contenedor = document.getElementById('catalogo-productos');
    contenedor.innerHTML = "<p style='padding:20px; color:var(--text-muted);'>Cargando mercado interactivo...</p>";

    const userSession = JSON.parse(localStorage.getItem('sesion_exporta'));

    try {
        const response = await fetch(`${API_BASE}/api/catalogo`);
        if(!response.ok) throw new Error("Error en catálogo");
        
        const bd_real = await response.json();

        if (bd_real.length === 0) {
            contenedor.innerHTML = "<p style='padding:20px; color:var(--text-muted);'>No hay productos disponibles actualmente en el mercado.</p>";
            if (marcadoresMapa) marcadoresMapa.clearLayers();
            return;
        }

        actualizarMapa(bd_real);

        let html = '<table class="data-table"><tr><th>Vendedor</th><th>Producto</th><th>Disp.</th><th>Precio</th><th>Ubicación</th><th>Acción</th></tr>';
        
        bd_real.forEach(item => {
            let btnAccion = "";

            if (!userSession) {
                btnAccion = `<button onclick="alertaRegistroCompra()" style="background:var(--secondary); color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;">🛒 Inicia sesión para comprar</button>`;
            } else {
                if (userSession.telefono === item.creador_usuario) {
                    btnAccion = `<button onclick="eliminarProducto(${item.id_producto})" style="background:var(--danger); color:white; border:none; padding:8px; border-radius:5px; width:100%; cursor:pointer; font-weight:bold;" title="Retirar del mercado">🗑️ Eliminar</button>`;
                } else {
                    btnAccion = `<button onclick="iniciarProcesoCompra(${item.id_producto})" style="background:var(--primary); color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;">🛒 Comprar</button>`;
                }
            }

            const fullImageUrl = item.imagen_url.startsWith('http') ? item.imagen_url : `${API_BASE}${item.imagen_url}`;

            html += `<tr>
                <td><strong>${item.vendedor_finca}</strong></td>
                <td><div style="display: flex; align-items: center; gap: 10px;"><img src="${fullImageUrl}" class="prod-img" alt="${item.producto}">${item.producto}</div></td>
                <td>${item.cantidad} ${item.unidad}</td>
                <td style="color:var(--primary); font-weight:bold;">$${item.precio}</td>
                <td>📍 ${item.ubicacion_vendedor}</td>
                <td>${btnAccion}</td>
            </tr>`;
        });
        html += '</table>';
        contenedor.innerHTML = html;
    } catch (error) {
        contenedor.innerHTML = "<p style='padding:20px; color:red;'>Error conectando al servidor. Recarga la página en unos segundos.</p>";
    }
}

window.alertaRegistroCompra = function() {
    alert("🔒 Para proteger a los productores, necesitas registrarte gratis antes de poder comprar.");
    navegar('vista-registro');
}

async function iniciarProcesoCompra(productoId) {
    const userSession = JSON.parse(localStorage.getItem('sesion_exporta'));
    
    const datosCompra = {
        producto_id: productoId,
        comprador_nombre: userSession.nombre + " " + userSession.apellido,
        comprador_ubicacion: userSession.localizacion 
    };

    try {
        const response = await fetch(`${API_BASE}/api/registrar-compra`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosCompra)
        });

        if (response.ok) {
            document.getElementById('modalPago').style.display = 'flex';
        } else {
            alert("Error al registrar la transacción en BD.");
        }
    } catch (error) {
        alert("Error conectando a base de datos para registrar la transacción.");
    }
}

// --- 4. PANEL DE ADMINISTRADOR ---

const equipo = ["Gael Jesús Marroquín Mateo", "Yuslin Garcia Ramos", "Leo Ronay Velazquez Gutierrez"];

function loginAdmin() {
    const userText = document.getElementById('admin-user').value.toLowerCase();
    const passText = document.getElementById('admin-pass').value;
    let esDelEquipo = equipo.some(miembro => userText.includes(miembro.toLowerCase().split(' ')[0]));

    if (esDelEquipo && passText === '253044') {
        localStorage.setItem('admin_logueado', 'true');
        verificarEstadoAdmin();
    } else {
        alert("Acceso Denegado. Autor no reconocido o contraseña incorrecta.");
    }
}

function verificarEstadoAdmin() {
    if (localStorage.getItem('admin_logueado') === 'true') {
        document.getElementById('admin-login-box').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        cargarTablaAdminDB();
        cargarTablaProductosAdminDB(); // CARGA LA NUEVA TABLA DE PUBLICACIONES
    } else {
        document.getElementById('admin-login-box').style.display = 'block';
        document.getElementById('admin-dashboard').style.display = 'none';
    }
}

function cerrarAdmin() {
    localStorage.removeItem('admin_logueado');
    verificarEstadoAdmin();
}

async function cargarTablaAdminDB() {
    const contenedor = document.getElementById('tabla-transacciones');
    contenedor.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>Cargando registro...</p>";

    try {
        const response = await fetch(`${API_BASE}/api/admin/transacciones`);
        const transacciones = await response.json();

        if (transacciones.length === 0) {
            contenedor.innerHTML = "<p style='padding: 20px;'>No hay registros de compras y ventas aún.</p>";
            return;
        }

        let html = '<table class="compra-table"><tr><th>Comprador (Cliente)</th><th>Origen Compra</th><th>Vendedor</th><th>Producto</th><th>Precio</th><th>Fecha</th></tr>';
        transacciones.forEach(item => {
            const fecha = new Date(item.fecha_compra).toLocaleString('es-MX');
            html += `<tr>
                <td style="font-weight: bold; color: var(--secondary);">👤 ${item.comprador_nombre}</td>
                <td>🗺️ ${item.comprador_ubicacion_origen}</td>
                <td>${item.vendedor_nombre}</td>
                <td><strong>${item.producto_nombre}</strong></td>
                <td style="color: var(--primary); font-weight: bold;">$${item.precio_venta}</td>
                <td style="color: gray; font-size: 0.85rem;">${fecha}</td>
            </tr>`;
        });
        html += '</table>';
        contenedor.innerHTML = html;
        
    } catch (error) {
        contenedor.innerHTML = "<p style='color: red; padding: 20px;'>Error conectando al panel de control.</p>";
    }
}

// NUEVA FUNCIÓN: CARGAR REGISTRO DE TODAS LAS PUBLICACIONES PARA EL ADMIN
async function cargarTablaProductosAdminDB() {
    const contenedor = document.getElementById('tabla-productos-admin');
    contenedor.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>Cargando inventario histórico...</p>";

    try {
        const response = await fetch(`${API_BASE}/api/admin/productos`);
        const productos = await response.json();

        if (productos.length === 0) {
            contenedor.innerHTML = "<p style='padding: 20px;'>No hay productos registrados en la base de datos.</p>";
            return;
        }

        let html = '<table class="data-table"><tr><th>ID</th><th>Vendedor</th><th>Producto</th><th>Estado</th><th>Acción Admin</th></tr>';
        productos.forEach(item => {
            let badgeEstado = item.estado === 'activo' 
                ? '<span style="background:var(--primary); color:white; padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:bold;">Activo</span>' 
                : '<span style="background:#6b7280; color:white; padding:4px 8px; border-radius:12px; font-size:0.8rem; font-weight:bold;">Oculto por Vendedor</span>';

            html += `<tr>
                <td style="color: gray; font-weight: bold;">#${item.id_producto}</td>
                <td>${item.vendedor_finca}</td>
                <td><strong>${item.producto}</strong> (${item.cantidad} ${item.unidad})</td>
                <td>${badgeEstado}</td>
                <td><button onclick="eliminarProductoPermanenteAdmin(${item.id_producto})" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:5px; cursor:pointer; font-weight:bold;">⚠️ Borrar Definitivo</button></td>
            </tr>`;
        });
        html += '</table>';
        contenedor.innerHTML = html;
    } catch (error) {
        contenedor.innerHTML = "<p style='color: red; padding: 20px;'>Error cargando el historial de productos.</p>";
    }
}

// NUEVA FUNCIÓN: EL ADMIN BORRA PERMANENTEMENTE (Hard Delete)
async function eliminarProductoPermanenteAdmin(productoId) {
    if(confirm("⚠️ ATENCIÓN ADMIN: \n\n¿Estás seguro de que deseas eliminar este producto PERMANENTEMENTE de la Base de Datos? Esta acción no se puede deshacer.")) {
        try {
            const response = await fetch(`${API_BASE}/api/admin/eliminar-producto-permanente/${productoId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                alert("✅ Producto eliminado permanentemente de la base de datos.");
                cargarTablaProductosAdminDB(); 
                if(document.getElementById('vista-tienda').classList.contains('active')) {
                    renderizarCatalogoDB();
                }
            } else {
                alert("Error al intentar borrar permanentemente.");
            }
        } catch (error) {
            alert("Error de conexión con el servidor.");
        }
    }
}

// --- 5. PERFILES Y ACCESIBILIDAD ---

function cerrarSesion() {
    localStorage.removeItem('sesion_exporta');
    location.reload();
}

function toggleDarkMode() {
    const activo = document.body.classList.toggle('dark-mode');
    localStorage.setItem('dark_mode', activo);
}

function toggleLargeText() {
    const activo = document.body.classList.toggle('large-text');
    localStorage.setItem('large_text', activo);
}

function toggleLectorVoz() {
    const activo = document.getElementById('toggle-voice').checked;
    localStorage.setItem('lector_voz', activo);
    if(!activo) window.speechSynthesis.cancel();
}

function cargarAjustes() {
    const user = JSON.parse(localStorage.getItem('sesion_exporta'));
    
    const formRegistro = document.getElementById('bloque-formulario');
    const perfilActivo = document.getElementById('bloque-perfil');

    if(user) {
        if(formRegistro) formRegistro.style.display = 'none';
        if(perfilActivo) {
            perfilActivo.style.display = 'block';
            document.getElementById('texto-bienvenida').innerText = "¡Hola, " + user.nombre + "!";
        }
        document.querySelector('.btn-registro-nav').innerText = "Perfil";
    } else {
        if(formRegistro) formRegistro.style.display = 'block';
        if(perfilActivo) perfilActivo.style.display = 'none';
        document.querySelector('.btn-registro-nav').innerText = "Registro";
    }

    if(localStorage.getItem('dark_mode') === 'true') {
        document.body.classList.add('dark-mode');
        if(document.getElementById('toggle-dark')) document.getElementById('toggle-dark').checked = true;
    }
    if(localStorage.getItem('large_text') === 'true') {
        document.body.classList.add('large-text');
        if(document.getElementById('toggle-text')) document.getElementById('toggle-text').checked = true;
    }
    if(localStorage.getItem('lector_voz') === 'true') {
        if(document.getElementById('toggle-voice')) document.getElementById('toggle-voice').checked = true;
    }
}

// --- 8. GRÁFICAS ---

function animateDonut(type) {
    const canvas = document.getElementById('donutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, radius = Math.min(w, h) / 2 - 10;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    let producerAngle = type === 'traditional' ? (0.3 * Math.PI * 2) : (Math.PI * 2);

    if (type === 'traditional') {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, producerAngle, Math.PI * 2);
        ctx.fillStyle = '#ef4444'; 
        ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, 0, producerAngle);
    ctx.fillStyle = '#16a34a'; 
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const textEl = document.getElementById('donutText');
    if (type === 'traditional') {
        textEl.innerHTML = "PRODUCTOR: 30% <br> <span style='color:var(--text-muted); font-size:1rem;'>INTERMEDIARIOS: 70%</span>";
        textEl.style.color = "var(--danger)";
    } else {
        textEl.innerHTML = "PRODUCTOR: 100% <br> <span style='color:var(--text-muted); font-size:1rem;'>TRATO DIRECTO</span>";
        textEl.style.color = "var(--primary)";
    }
}

// --- 9. PWA ---

let eventoInstalacion;
const botonInstalar = document.getElementById('btn-instalar');
const contenedorInstalar = document.getElementById('contenedor-instalar');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacion = e;
    if (contenedorInstalar) contenedorInstalar.style.display = 'flex';
});

if (botonInstalar) {
    botonInstalar.addEventListener('click', async () => {
        if (!eventoInstalacion) return;
        eventoInstalacion.prompt();
        const { outcome } = await eventoInstalacion.userChoice;
        if (outcome === 'accepted') {
            if (contenedorInstalar) contenedorInstalar.style.display = 'none';
        }
        eventoInstalacion = null;
    });
}

window.addEventListener('appinstalled', () => {
    if (contenedorInstalar) contenedorInstalar.style.display = 'none';
});

function cargarTodo() {
    cargarAjustes();
    updateLimit(document.getElementById('limitRange') ? document.getElementById('limitRange').value : 60);
    updateDeriv(document.getElementById('derivRange') ? document.getElementById('derivRange').value : 50);
    sincronizarOpt(document.getElementById('optInput') ? document.getElementById('optInput').value : 100);

    setTimeout(() => animateDonut('traditional'), 200);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');

    const ultimaPestana = localStorage.getItem('pestana_actual');
    if (ultimaPestana) {
        navegar(ultimaPestana);
    } else {
        navegar('vista-inicio');
    }
}
