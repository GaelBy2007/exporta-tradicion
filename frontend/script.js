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

    // Línea de costo base
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, h - 50);
    ctx.lineTo(w, h - 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Barra de precio
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
    
    // Curva simulando la derivada
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
    // Ecuación matemática para buscar la ganancia óptima
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

    if(id === 'vista-tienda') renderizarCatalogo();
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

// --- 3. BASE DE DATOS LOCAL Y SERVIDOR (VENDER Y COMPRAR) ---

// Guardar cuenta de usuario (Conecta con Python si está encendido)
async function guardarRegistroGeneral(e) {
    e.preventDefault();
    const datos = {
        nombre: document.getElementById('reg-nombre').value,
        apellido: document.getElementById('reg-apellido').value,
        localizacion: document.getElementById('reg-localizacion').value,
        telefono: document.getElementById('reg-telefono').value
    };

    try {
        const response = await fetch('http://127.0.0.1:8000/api/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            console.log("Guardado en SQLite mediante Python.");
        } else {
            console.warn("Python arrojó un error, pero se guardará localmente.");
        }
    } catch (error) {
        console.warn("Servidor Python apagado o inaccesible. Guardando solo en LocalStorage.");
    }

    // Siempre guardamos la sesión local para que la página funcione
    localStorage.setItem('sesion_exporta', JSON.stringify(datos));
    cargarAjustes();
    navegar('vista-inicio');
    alert("¡Cuenta registrada con éxito!");
}

function guardarRegistroVenta(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('sesion_exporta'));
    if(!user) {
        alert("Primero debes registrarte (Sección Registro) para poder publicar un producto.");
        navegar('vista-registro');
        return;
    }

    const vendedor = document.getElementById('ven-nombre').value;
    const ubicacion = document.getElementById('ven-ubicacion').value;
    const producto = document.getElementById('ven-producto').value;
    const cantidad = document.getElementById('ven-cantidad').value;
    const unidad = document.getElementById('ven-unidad').value;
    const precio = document.getElementById('ven-precio').value;

    let bd = JSON.parse(localStorage.getItem('bd_exporta')) || [];
    bd.push({
        id: Date.now(),
        creador: user.nombre + " " + user.apellido, // Etiqueta al autor
        vendedor: vendedor,
        producto: producto,
        cantidad: cantidad,
        unidad: unidad,
        precio: precio,
        ubicacion: ubicacion
    });
    localStorage.setItem('bd_exporta', JSON.stringify(bd));
    
    alert("¡Cosecha publicada con éxito en el Mercado!");
    e.target.reset();
    navegar('vista-tienda');
}

function renderizarCatalogo() {
    const contenedor = document.getElementById('catalogo-productos');
    let bd = JSON.parse(localStorage.getItem('bd_exporta')) || [];
    const user = JSON.parse(localStorage.getItem('sesion_exporta'));

    if (bd.length === 0) {
        contenedor.innerHTML = "<p style='padding:20px; color:var(--text-muted);'>No hay productos disponibles actualmente en el mercado.</p>";
        return;
    }

    let html = '<table class="data-table"><tr><th>Vendedor / Finca</th><th>Producto</th><th>Disponibilidad</th><th>Precio</th><th>Ubicación</th><th>Acción</th></tr>';
    
    bd.forEach(item => {
        let nombreCompletoUser = user ? (user.nombre + " " + user.apellido) : "";
        let esMio = (nombreCompletoUser === item.creador);
        
        let btnAccion = esMio 
            ? `<button onclick="borrarProducto(${item.id})" style="background:var(--danger); color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;">❌ Eliminar (Mío)</button>`
            : `<button onclick="document.getElementById('modalPago').style.display='flex'" style="background:var(--primary); color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;">🛒 Comprar</button>`;

        html += `<tr>
            <td><strong>${item.vendedor}</strong></td>
            <td>${item.producto}</td>
            <td>${item.cantidad} ${item.unidad}</td>
            <td style="color:var(--primary); font-weight:bold;">$${item.precio}</td>
            <td>${item.ubicacion}</td>
            <td>${btnAccion}</td>
        </tr>`;
    });
    html += '</table>';
    contenedor.innerHTML = html;
}

function borrarProducto(idABorrar) {
    if(confirm("¿Estás seguro de eliminar este producto? Ya no aparecerá en el mercado.")) {
        let bd = JSON.parse(localStorage.getItem('bd_exporta')) || [];
        bd = bd.filter(item => item.id !== idABorrar);
        localStorage.setItem('bd_exporta', JSON.stringify(bd));
        
        renderizarCatalogo();
        if(document.getElementById('admin-dashboard').style.display === 'block') cargarTablaAdmin();
    }
}

// --- 4. PANEL DE ADMINISTRADOR ---

// Arreglo de autores autorizado
const equipo = [
    "Gael Jesús Marroquín Mateo", 
    "Oscar Toledo Carrascosa", 
    "Nelly Jackeline Chirino Ortiz", 
    "Julio Cesar Meridad Ramírez", 
    "Crhistopher Alexander Molina Hernández",
    "Leo Ronay Velazquez Gutierrez"
];

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
        cargarTablaAdmin();
    } else {
        document.getElementById('admin-login-box').style.display = 'block';
        document.getElementById('admin-dashboard').style.display = 'none';
    }
}

function cerrarAdmin() {
    localStorage.removeItem('admin_logueado');
    verificarEstadoAdmin();
}

function cargarTablaAdmin() {
    const contenedor = document.getElementById('tabla-solicitudes');
    let bd = JSON.parse(localStorage.getItem('bd_exporta')) || [];

    if (bd.length === 0) {
        contenedor.innerHTML = "<p style='color: var(--text-muted); padding: 20px;'>No hay registros de ventas en la Base de Datos.</p>";
        return;
    }

    let html = '<table class="data-table"><tr><th>Publicado por</th><th>Producto / Finca</th><th>Cantidad</th><th>Precio</th><th>Acción</th></tr>';
    
    bd.forEach(item => {
        let creadorPost = item.creador ? item.creador : "Usuario Anónimo";
        
        html += `<tr>
            <td style="font-weight: bold; color: var(--secondary);">👤 ${creadorPost}</td>
            <td><strong>${item.producto}</strong><br><small style="color: gray;">📍 ${item.vendedor} - ${item.ubicacion}</small></td>
            <td>${item.cantidad} ${item.unidad}</td>
            <td style="color: var(--primary); font-weight: bold;">$${item.precio}</td>
            <td>
                <button onclick="borrarProducto(${item.id})" style="background: var(--danger); color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">🗑️ Eliminar Post</button>
            </td>
        </tr>`;
    });
    
    html += '</table>';
    contenedor.innerHTML = html;
}

// --- 5. PERFIL DE USUARIO ---

function cerrarSesion() {
    localStorage.removeItem('sesion_exporta');
    location.reload();
}

// --- 6. ACCESIBILIDAD Y CONFIGURACIÓN ---

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
    if(user) {
        document.getElementById('bloque-formulario').style.display = 'none';
        document.getElementById('bloque-perfil').style.display = 'block';
        document.getElementById('texto-bienvenida').innerText = "¡Hola, " + user.nombre + "!";
        document.querySelector('.btn-registro-nav').innerText = "Perfil: " + user.nombre;
    } else {
        document.getElementById('bloque-formulario').style.display = 'block';
        document.getElementById('bloque-perfil').style.display = 'none';
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

// --- 8. GRÁFICA DE DISTRIBUCIÓN (DONA INTERACTIVA) ---

function animateDonut(type) {
    const canvas = document.getElementById('donutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 10;

    // Limpiamos el lienzo para redibujar
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    // Ángulo para el Productor (30% en tradicional, 100% en justo)
    let producerAngle = type === 'traditional' ? (0.3 * Math.PI * 2) : (Math.PI * 2);

    // 1. Dibujar tajada del Coyote (Rojo)
    if (type === 'traditional') {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, producerAngle, Math.PI * 2);
        ctx.fillStyle = '#ef4444'; // var(--danger)
        ctx.fill();
    }

    // 2. Dibujar tajada del Productor (Verde)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, 0, producerAngle);
    ctx.fillStyle = '#16a34a'; // var(--primary)
    ctx.fill();

    // 3. Hacer el hueco transparente del centro (para que sea una dona)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // 4. Actualizar los porcentajes en texto
    const textEl = document.getElementById('donutText');
    if (type === 'traditional') {
        textEl.innerHTML = "PRODUCTOR: 30% <br> <span style='color:var(--text-muted); font-size:1rem;'>INTERMEDIARIOS: 70%</span>";
        textEl.style.color = "var(--danger)";
    } else {
        textEl.innerHTML = "PRODUCTOR: 100% <br> <span style='color:var(--text-muted); font-size:1rem;'>TRATO DIRECTO</span>";
        textEl.style.color = "var(--primary)";
    }
}

// --- 7. INICIALIZADOR PRINCIPAL ---

function cargarTodo() {
    cargarAjustes();
    renderizarCatalogo();
    
    // Inicializar gráficas de mercado
    updateLimit(document.getElementById('limitRange') ? document.getElementById('limitRange').value : 60);
    updateDeriv(document.getElementById('derivRange') ? document.getElementById('derivRange').value : 50);
    sincronizarOpt(document.getElementById('optInput') ? document.getElementById('optInput').value : 100);

    // Iniciar animación de la dona (Carga visual inicial)
    setTimeout(() => animateDonut('traditional'), 200);

    // Activar PWA (Service Worker)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
}
