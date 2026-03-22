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

// --- 2. NAVEGACIÓN Y ACCESIBILIDAD ---

function navegar(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const vista = document.getElementById(id);
    vista.classList.add('active');
    window.scrollTo(0,0);

    // Cargar Catálogo siempre
    if(id === 'vista-tienda') renderizarCatalogoDB();
    if(id === 'vista-admin') verificarEstadoAdmin();

    if(localStorage.getItem('lector_voz') === 'true') {
        window.speechSynthesis.cancel();
        const texto = vista.innerText.substring(0, 350); 
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

// AQUÍ ESTÁ EL CAMBIO: Ahora apunta a tu servidor real en la nube
const API_BASE = "https://exporta-tradicion.onrender.com";

// Lógica de Registro (Funciona para ambos: Comprador y Vendedor)
async function registrarGenerico(e, rolStr, prefix) {
    e.preventDefault();
    const datos = {
        nombre: document.getElementById(prefix+'-nombre').value,
        apellido: document.getElementById(prefix+'-apellido').value,
        localizacion: document.getElementById(prefix+'-localizacion').value,
        telefono: document.getElementById(prefix+'-telefono').value,
        rol: rolStr
    };

    try {
        const response = await fetch(`${API_BASE}/api/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            localStorage.setItem('sesion_exporta', JSON.stringify(datos));
            cargarAjustes(); // Esto mostrará los menús correctos
            
            if (rolStr === 'comprador') {
                navegar('vista-tienda');
                alert("¡Cuenta de Cliente creada! Ya puedes explorar y comprar productos.");
            } else {
                alert("¡Cuenta de Productor creada! Ya puedes llenar los datos de tu cosecha para publicarla.");
            }
        } else {
            const result = await response.json();
            alert("Error: " + result.detail);
        }
    } catch (error) {
        alert("Error de conexión con el servidor. Es posible que esté iniciando, intenta de nuevo en unos segundos.");
    }
}

window.registrarComprador = function(e) { registrarGenerico(e, 'comprador', 'regC'); }
window.registrarVendedor = function(e) { registrarGenerico(e, 'vendedor', 'regV'); }

// Publicar Producto
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

// Catálogo
async function renderizarCatalogoDB() {
    const contenedor = document.getElementById('catalogo-productos');
    contenedor.innerHTML = "<p style='padding:20px; color:var(--text-muted);'>Cargando mercado...</p>";

    const userSession = JSON.parse(localStorage.getItem('sesion_exporta'));

    try {
        const response = await fetch(`${API_BASE}/api/catalogo`);
        if(!response.ok) throw new Error("Error en catálogo");
        
        const bd_real = await response.json();

        if (bd_real.length === 0) {
            contenedor.innerHTML = "<p style='padding:20px; color:var(--text-muted);'>No hay productos disponibles actualmente en el mercado.</p>";
            return;
        }

        let html = '<table class="data-table"><tr><th>Vendedor</th><th>Producto</th><th>Disp.</th><th>Precio</th><th>Ubicación</th><th>Acción</th></tr>';
        
        bd_real.forEach(item => {
            let btnAccion = "";

            if (!userSession) {
                btnAccion = `<button onclick="alertaRegistroCompra()" style="background:var(--secondary); color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;">🛒 Inicia sesión para comprar</button>`;
            } else if (userSession.rol === 'vendedor') {
                if (userSession.telefono === item.creador_usuario) {
                    btnAccion = `<button style="background:#94a3b8; color:white; border:none; padding:8px; border-radius:5px; width:100%;" disabled>Mi Publicación</button>`;
                } else {
                    btnAccion = `<button onclick="alert('Tu perfil es de Vendedor. Si deseas comprar otros productos, crea una cuenta de Cliente.')" style="background:#ef4444; color:white; border:none; padding:8px; border-radius:5px; cursor:not-allowed; width:100%;">Solo venta</button>`;
                }
            } else if (userSession.rol === 'comprador') {
                btnAccion = `<button onclick="iniciarProcesoCompra(${item.id_producto})" style="background:var(--primary); color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;">🛒 Comprar</button>`;
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
        contenedor.innerHTML = "<p style='padding:20px; color:red;'>Error conectando al backend. Es posible que el servidor esté iniciando, recarga la página en unos segundos.</p>";
    }
}

window.alertaRegistroCompra = function() {
    alert("🔒 Para proteger a los productores, necesitas registrarte como CLIENTE gratis antes de comprar.");
    navegar('vista-registro');
}

// Comprar Producto
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

const equipo = ["Gael Jesús Marroquín Mateo", "Oscar Toledo Carrascosa", "Nelly Jackeline Chirino Ortiz", "Julio Cesar Meridad Ramírez", "Crhistopher Alexander Molina Hernández"];

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
    
    // Contenedores del Comprador (Registro normal)
    const formComprador = document.getElementById('bloque-formulario-comprador');
    const perfilGlobal = document.getElementById('bloque-perfil');
    
    // Contenedores del Vendedor (Vender Cosecha)
    const formVendedor = document.getElementById('bloque-registro-vendedor');
    const publicarVenta = document.getElementById('bloque-publicar-venta');
    const vendedorDenegado = document.getElementById('bloque-vendedor-denegado');

    if(user) {
        if(formComprador) formComprador.style.display = 'none';
        if(perfilGlobal) {
            perfilGlobal.style.display = 'block';
            document.getElementById('texto-bienvenida').innerText = "¡Hola, " + user.nombre + "!";
            document.getElementById('texto-rol').innerText = "Modo: " + (user.rol === 'vendedor' ? "🌾 Productor (Vendedor)" : "🛒 Cliente (Comprador)");
        }
        document.querySelector('.btn-registro-nav').innerText = "Perfil";

        if(formVendedor) formVendedor.style.display = 'none';
        
        if(user.rol === 'vendedor') {
            if(publicarVenta) publicarVenta.style.display = 'block';
            if(vendedorDenegado) vendedorDenegado.style.display = 'none';
        } else {
            if(publicarVenta) publicarVenta.style.display = 'none';
            if(vendedorDenegado) vendedorDenegado.style.display = 'block';
        }

    } else {
        if(formComprador) formComprador.style.display = 'block';
        if(perfilGlobal) perfilGlobal.style.display = 'none';
        
        if(formVendedor) formVendedor.style.display = 'block';
        if(publicarVenta) publicarVenta.style.display = 'none';
        if(vendedorDenegado) vendedorDenegado.style.display = 'none';
        
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
}
