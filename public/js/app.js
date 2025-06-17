// CLASSCRAFT - JAVASCRIPT BASE PARA APIS

// Configuración base
const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let authToken = null;

// Cargar token del localStorage (si existe)
function loadToken() {
    const saved = localStorage.getItem('classcraft_token');
    const savedUser = localStorage.getItem('classcraft_user');
    
    if (saved && savedUser) {
        authToken = saved;
        currentUser = JSON.parse(savedUser);
        return true;
    }
    return false;
}

// Guardar token y usuario
function saveAuth(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('classcraft_token', token);
    localStorage.setItem('classcraft_user', JSON.stringify(user));
}

// Limpiar auth
function clearAuth() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('classcraft_token');
    localStorage.removeItem('classcraft_user');
}

// Headers para requests autenticadas
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

// Función base para hacer requests
async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${API_BASE}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error en la request');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// FUNCIONES DE AUTENTICACIÓN
async function login(email, password) {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    saveAuth(data.token, data.usuario);
    return data;
}

async function register(nombre, email, password, rol = 'estudiante') {
    const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password, rol })
    });
    
    saveAuth(data.token, data.usuario);
    return data;
}

async function getProfile() {
    return await apiRequest('/auth/profile', {
        headers: getAuthHeaders()
    });
}

// FUNCIONES DE PERSONAJES
async function getMyPersonaje() {
    return await apiRequest('/personajes/mi-personaje', {
        headers: getAuthHeaders()
    });
}

async function createPersonaje(clasePersonajeId, razaId) {
    return await apiRequest('/personajes/crear', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            clase_personaje_id: clasePersonajeId,
            raza_id: razaId
        })
    });
}

async function useHabilidad(habilidadId) {
    return await apiRequest('/personajes/usar-habilidad', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            habilidad_id: habilidadId
        })
    });
}

async function getPersonajeStats() {
    return await apiRequest('/personajes/stats', {
        headers: getAuthHeaders()
    });
}

// FUNCIONES DE CLASES
async function createClase(nombre, descripcion) {
    return await apiRequest('/clases/crear', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nombre, descripcion })
    });
}

async function joinClase(codigo) {
    return await apiRequest(`/clases/unirse/${codigo}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
}

async function getMyClases() {
    return await apiRequest('/clases/mis-clases', {
        headers: getAuthHeaders()
    });
}

async function getClaseEstudiantes(claseId) {
    return await apiRequest(`/clases/${claseId}/estudiantes`, {
        headers: getAuthHeaders()
    });
}

async function giveXP(claseId, estudianteId, cantidad, razon) {
    return await apiRequest(`/clases/${claseId}/estudiante/${estudianteId}/xp`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ cantidad, razon })
    });
}

async function modifyStats(claseId, estudianteId, salud, energia, razon) {
    const body = { razon };
    if (salud !== undefined) body.salud = salud;
    if (energia !== undefined) body.energia = energia;
    
    return await apiRequest(`/clases/${claseId}/estudiante/${estudianteId}/stats`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body)
    });
}

// FUNCIONES DE DATOS
async function getClasesPersonaje() {
    return await apiRequest('/clases-personaje');
}

async function getRazas() {
    return await apiRequest('/razas');
}

async function getHabilidades() {
    return await apiRequest('/habilidades');
}

// FUNCIONES DEV
async function resetDatabase() {
    return await apiRequest('/setup');
}

async function getDbStats() {
    return await apiRequest('/test');
}

// UTILIDADES UI
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Insertar al inicio del container principal
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showLoading(element) {
    element.innerHTML = '<div class="loading">Cargando...</div>';
}

function hideLoading(element) {
    const loading = element.querySelector('.loading');
    if (loading) loading.remove();
}

// Verificar autenticación en páginas protegidas
function requireAuth() {
    if (!loadToken()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Logout
function logout() {
    clearAuth();
    window.location.href = '/login.html';
}

// Formatear stats para mostrar
function formatStats(current, max) {
    const percentage = (current / max) * 100;
    return {
        text: `${current}/${max}`,
        percentage: percentage
    };
}

// Renderizar barra de progreso
function renderProgressBar(current, max, type = 'xp') {
    const percentage = Math.min((current / max) * 100, 100);
    return `
        <div class="progress-bar">
            <div class="progress-fill progress-${type}" style="width: ${percentage}%"></div>
        </div>
        <small>${current}/${max} (${Math.round(percentage)}%)</small>
    `;
}

// Event listener para cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Cargar token si existe
    loadToken();
    
    // Agregar evento de logout a todos los botones de logout
    const logoutBtns = document.querySelectorAll('.btn-logout');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', logout);
    });
});

// Función para debuggear en consola
window.ClassCraftAPI = {
    login,
    register,
    getProfile,
    getMyPersonaje,
    createPersonaje,
    useHabilidad,
    createClase,
    joinClase,
    getMyClases,
    currentUser,
    authToken
};

console.log('🎮 ClassCraft API cargada! Usa window.ClassCraftAPI para debuggear');
