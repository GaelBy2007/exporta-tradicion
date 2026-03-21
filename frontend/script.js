// ==========================================
// 0. CONFIGURACIÓN GLOBAL
// ==========================================
// Esta es la dirección de tu "cerebro" en la nube (Render)
const API_URL = "https://exportatradicion-api.onrender.com";

// ==========================================
// 1. SISTEMA DE NAVEGACIÓN Y VISTAS
// ==========================================
function navegar(vistaId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(vistaId).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if(vistaId === 'vista-tienda' || vistaId === 'vista-inicio') {
        setTimeout(() => {
            if(vistaId === 'vista-inicio') animateDonut('traditional');
            if(vistaId === 'vista-tienda') {
                updateLimit(document.getElementById('limitRange').value);
                updateDeriv(document.getElementById('derivRange').value);
                updateOpt(document.getElementById('optRange').value);
            }
        }, 100);
    }
    
    detenerVoz();
    
    const isVozActiva = localStorage.getItem('agroJusto_voz') === 'true';
    if(isVozActiva) {
        setTimeout(() => {
            leerPáginaActual();
        }, 500); 
    }
}

// ==========================================
// 2. ACCESIBILIDAD Y LECTOR DE VOZ
// ==========================================
function toggleDarkMode() {
    const isDark = document.getElementById('toggle-dark').checked;
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('agroJusto_dark', isDark);
    if(document.getElementById('vista-inicio').classList.contains('active')) animateDonut('traditional');
}

function toggleLargeText() {
    const isLarge = document.getElementById('toggle-text').checked;
    document.body.classList.toggle('large-text', isLarge);
    localStorage.setItem('agroJusto_largeText', isLarge);
}

function toggleVozAutomatica() {
    const isVoz = document.getElementById('toggle-voz').checked;
    localStorage.setItem('agroJusto_voz', isVoz);
    if (!isVoz) detenerVoz();
}

let synth = window.speechSynthesis;
let leyendo = false;

function leerPáginaActual() {
    detenerVoz(); 
    const vistaActiva = document.querySelector('.view.active');
    if(!vistaActiva) return;

    let textoA_Leer = vistaActiva.innerText;
    if(vistaActiva.id === 'vista-inicio') {
        const headerText = document.querySelector('header').innerText;
        textoA_Leer = headerText + ". " + textoA_Leer;
    }

    const utterance = new SpeechSynthesisUtterance(textoA_Leer);
    utterance.lang = 'es-MX'; 
    utterance.rate = 0.95;    
    synth.speak(utterance);
    leyendo = true;
}

function detenerVoz() {
    synth.cancel();
    leyendo = false;
}

function cargarAjustesGuardados() {
    const isDark = localStorage.getItem('agroJusto_dark') === 'true';
    const isLarge = localStorage.getItem('agroJusto_largeText') === 'true';
    const isVoz = localStorage.getItem('agroJusto_voz') === 'true';

    if(isDark) { document.body.classList.add('dark-mode'); if(document.getElementById('toggle-dark')) document.getElementById('toggle-dark').checked = true; }
    if(isLarge) { document.body.classList.add('large-text'); if(document.getElementById('toggle-text')) document.getElementById('toggle-text').checked = true; }
    if(isVoz && document.getElementById('toggle-voz')) document.getElementById('toggle-voz').checked = true;
}

// ==========================================
// 3. SESIÓN, LOGIN Y LOGOUT
// ==========================================
async function guardarRegistroGeneral(e) {
    e.preventDefault();
    const usuario = {
        nombre: document.getElementById('reg-nombre').value,
        apellido: document.getElementById('reg-apellido').value,
        localizacion: document.getElementById('reg-localizacion').value,
        telefono: document.getElementById('reg-telefono').value,
    };

    try {
        const respuesta = await fetch(`${API_URL}/api/registro`, {
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(usuario)
        });

        if (respuesta.ok) {
            localStorage.setItem('agroJusto_usuario', JSON.stringify(usuario));
            verificarSesion(); 
            alert(`¡Bienvenido a Exporta Tradición, ${usuario.nombre}! Tu registro está seguro en la Base de Datos.`);
            navegar('vista-tienda');
        } else {
            const error = await respuesta.json();
            alert("Atención: " + error.detail);
        }
    } catch (error) {
        console.error("Error servidor:", error);
        alert("El servidor en la nube está despertando. Intenta de nuevo en un minuto.");
    }
}

function verificarSesion() {
    const usuarioGuardado = localStorage.getItem('agroJusto_usuario');
    const bloqueForm = document.getElementById('bloque-formulario');
    const bloquePerfil = document.getElementById('bloque-perfil');
    const textoBienvenida = document.getElementById('texto-bienvenida');
    const botonesRegistroNav = document.querySelectorAll('.btn-registro-nav');

    if (usuarioGuardado) {
        const u = JSON.parse(usuarioGuardado);
        botonesRegistroNav.forEach(btn => btn.innerText = `👤 ${u.nombre}`);
        if(bloqueForm) bloqueForm.style.display = 'none';
        if(bloquePerfil) {
            bloquePerfil.style.display = 'block';
            textoBienvenida.innerText = `¡Hola, ${u.nombre}!`;
        }
    } else {
        botonesRegistroNav.forEach(btn => btn.innerText = `Registro`);
        if(bloqueForm) bloqueForm.style.display = 'block';
        if(bloquePerfil) bloquePerfil.style.display = 'none';
    }
}

function cerrarSesion() {
    localStorage.removeItem('agroJusto_usuario');
    alert("Has cerrado sesión correctamente.");
    location.reload(); 
}

function guardarRegistroVenta(e) {
    e.preventDefault();
    const producto = {
        productor: document.getElementById('ven-nombre').value,
        ubicacion: document.getElementById('ven-ubicacion').value,
        nombreProd: document.getElementById('ven-producto').value,
        precio: document.getElementById('ven-precio').value,
    };
    localStorage.setItem('agroJusto_venta', JSON.stringify(producto));
    agregarProductoAlCatalogo(producto);
    alert('¡Producto registrado con éxito!');
    document.getElementById('form-registro-venta').reset();
    navegar('vista-tienda');
}

function agregarProductoAlCatalogo(prod) {
    const catalogo = document.getElementById('catalogo-productos');
    const nuevaTarjeta = document.createElement('div');
    nuevaTarjeta.className = 'card product-card';
    nuevaTarjeta.innerHTML = `
        <div class="product-img" style="background: linear-gradient(135deg, #10b981, #047857);">🌱</div>
        <div class="product-tags"><span class="tag fair" style="background: #fef08a; color: #854d0e;">Nuevo</span></div>
        <h3>${prod.nombreProd}</h3>
        <p class="producer">🧑🏽‍🌾 ${prod.productor} (${prod.ubicacion})</p>
        <p class="desc">Producto local recién agregado.</p>
        <div class="product-footer">
            <span class="price">$${prod.precio} <small>/ Unidad</small></span>
            <div class="action-buttons"><button class="btn-small buy" onclick="abrirModalPago('Comprar', '${prod.nombreProd}')">Comprar</button></div>
        </div>
    `;
    catalogo.prepend(nuevaTarjeta);
}

// ==========================================
// 4. GRÁFICOS Y MATEMÁTICAS (CANVAS)
// ==========================================
let currentTarget = 0.3, currentDraw = 0.3, donutAnimation;

function animateDonut(mode) {
    currentTarget = mode === 'traditional' ? 0.3 : 0.85;
    const text = document.getElementById('donutText');
    if(!text) return;
    text.innerText = mode === 'traditional' ? "PRODUCTOR: 30%" : "PRODUCTOR: 85%";
    text.style.color = mode === 'traditional' ? 'var(--danger)' : 'var(--primary)';
    cancelAnimationFrame(donutAnimation);
    drawFrame();
}

function drawFrame() {
    currentDraw += (currentTarget - currentDraw) * 0.08; 
    const canvas = document.getElementById('donutChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2, centerY = canvas.height / 2, radius = 100;
    let startAngle = -Math.PI / 2, sliceAngle1 = 2 * Math.PI * currentDraw;
    
    ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle1);
    ctx.fillStyle = currentTarget > 0.5 ? '#65a30d' : '#ef4444'; ctx.fill();
    let sliceAngle2 = 2 * Math.PI * (1 - currentDraw);
    ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.arc(centerX, centerY, radius, startAngle + sliceAngle1, startAngle + sliceAngle1 + sliceAngle2);
    ctx.fillStyle = currentTarget > 0.5 ? '#d9f99d' : '#fecaca'; ctx.fill();

    const esOscuro = document.body.classList.contains('dark-mode');
    ctx.beginPath(); ctx.arc(centerX, centerY, 65, 0, 2 * Math.PI);
    ctx.fillStyle = esOscuro ? '#1e1e1e' : '#ffffff'; ctx.fill();
    if (Math.abs(currentTarget - currentDraw) > 0.001) donutAnimation = requestAnimationFrame(drawFrame);
}

function updateLimit(price) {
    const canvas = document.getElementById('limitCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const costoProduccion = 42, yCosto = 150 - costoProduccion;
    ctx.beginPath(); ctx.strokeStyle = '#ef4444'; ctx.setLineDash([5, 5]);
    ctx.moveTo(0, yCosto); ctx.lineTo(250, yCosto); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ef4444"; ctx.font = "12px Arial"; ctx.fillText("Límite (Costo)", 140, yCosto - 5);
    const yPos = 150 - price;
    ctx.beginPath(); ctx.strokeStyle = price >= costoProduccion ? '#65a30d' : '#ef4444'; ctx.lineWidth = 3;
    ctx.moveTo(0, 150 - 80); ctx.lineTo(110, yPos); ctx.lineTo(250, yPos); ctx.stroke();
    document.getElementById('limitVal').innerText = "$" + price;
    const status = document.getElementById('limitStatus');
    if(price < costoProduccion) { status.innerText = "ALERTA: PÉRDIDA"; status.style.color = "var(--danger)"; } 
    else { status.innerText = "ESTADO: SEGURO"; status.style.color = "var(--primary)"; }
}

function updateDeriv(tVal) {
    const canvas = document.getElementById('derivCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath(); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 3;
    for(let x = 0; x <= 220; x++) { let y = 75 + Math.sin(x * 0.05) * 40; if(x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    let xPoint = parseInt(tVal), yPoint = 75 + Math.sin(xPoint * 0.05) * 40;
    let slope = Math.cos(xPoint * 0.05) * 2; 
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
    ctx.moveTo(xPoint - 40, yPoint - (slope * 40)); ctx.lineTo(xPoint + 40, yPoint + (slope * 40)); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#1e3a8a'; ctx.arc(xPoint, yPoint, 6, 0, Math.PI*2); ctx.fill();
    const status = document.getElementById('derivStatus'), formula = document.getElementById('derivFormula');
    if (slope > 0.1) { status.innerText = "CRECIENTE"; status.style.color = "var(--primary)"; formula.innerText = "dP/dt = +" + slope.toFixed(2); formula.style.color = "#bef264"; } 
    else if (slope < -0.1) { status.innerText = "DECRECIENTE"; status.style.color = "var(--danger)"; formula.innerText = "dP/dt = " + slope.toFixed(2); formula.style.color = "#fca5a5"; } 
    else { status.innerText = "INFLEXIÓN"; status.style.color = "var(--accent)"; formula.innerText = "dP/dt ≈ 0"; formula.style.color = "#d8b4fe"; }
}

async function updateOpt(val) {
    const canvas = document.getElementById('optCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath(); ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 3;
    for(let x = 0; x <= 100; x += 2) {
        let yCalc = -0.5 * Math.pow(x - 50, 2) + 1000;
        if(x === 0) ctx.moveTo(x * 2.2, 150 - (yCalc / 10)); else ctx.lineTo(x * 2.2, 150 - (yCalc / 10));
    }
    ctx.stroke();

    let profitLocal = -0.5 * Math.pow(val - 50, 2) + 1000;
    let cx = val * 2.2; 
    let cy = 150 - (profitLocal / 10);
    
    ctx.beginPath(); ctx.strokeStyle = '#a855f7'; ctx.setLineDash([4, 4]);
    ctx.moveTo(cx, 150); ctx.lineTo(cx, cy); ctx.lineTo(0, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.fillStyle = '#7e22ce'; ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill();

    document.getElementById('optVal').innerText = val + "kg";
    const status = document.getElementById('optStatus');
    const formula = document.getElementById('optFormula');
    status.innerText = "Calculando en Python...";
    formula.innerText = "...";

    try {
        const respuesta = await fetch(`${API_URL}/api/optimizar`, {
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ kilos_ofrecidos: parseFloat(val) })
        });
        if (respuesta.ok) {
            const datosServidor = await respuesta.json();
            if (val == datosServidor.recomendacion_optima) {
                status.innerText = `¡MÁXIMO!: $${datosServidor.ganancia_maxima_posible}`; status.style.color = "var(--accent)"; formula.innerText = `¡B'(${datosServidor.recomendacion_optima}) = 0!`; formula.style.color = "#d8b4fe";
            } else {
                status.innerText = `Python dice: $${datosServidor.beneficio_estimado}`; status.style.color = "var(--text-muted)"; formula.innerText = "B'(x) ≠ 0"; formula.style.color = "#bef264";
            }
        }
    } catch (error) { 
        status.innerText = `Estimado local: $${profitLocal}`; status.style.color = "var(--text-muted)"; formula.innerText = "Python desconectado"; formula.style.color = "var(--danger)";
    }
}

// ==========================================
// 5. INICIALIZACIÓN Y MODALES
// ==========================================
function abrirModalPago(accion, producto) {
    document.getElementById('modalTitle').innerText = accion + " " + producto; document.getElementById('tarjetaForm').style.display = 'none'; document.getElementById('efectivoInfo').style.display = 'none'; document.getElementById('modalPago').classList.add('active');
}
function cerrarModal() { document.getElementById('modalPago').classList.remove('active'); }
function cerrarModalSiFuera(e) { if (e.target.id === 'modalPago') cerrarModal(); }
function mostrarFormularioTarjeta() { document.getElementById('tarjetaForm').style.display = 'block'; document.getElementById('efectivoInfo').style.display = 'none'; }
function mostrarInfoEfectivo() { document.getElementById('efectivoInfo').style.display = 'block'; document.getElementById('tarjetaForm').style.display = 'none'; }
function simularTransaccion() { alert("¡Operación procesada con éxito!"); cerrarModal(); }

window.onload = () => {
    cargarAjustesGuardados();
    verificarSesion();
    const prodGuardado = localStorage.getItem('agroJusto_venta');
    if(prodGuardado) { agregarProductoAlCatalogo(JSON.parse(prodGuardado)); }
    drawFrame();
};