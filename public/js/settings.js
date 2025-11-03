// settings.js - Configuración de la aplicación

document.addEventListener('DOMContentLoaded', () => {
    loadAPIKeyStatus();
    setupEventListeners();
});

function setupEventListeners() {
    // Toggle visibility de API key
    const toggleBtn = document.getElementById('toggle-visibility');
    const apiKeyInput = document.getElementById('gemini-key');
    
    toggleBtn.addEventListener('click', () => {
        const icon = toggleBtn.querySelector('.material-symbols-outlined');
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            icon.textContent = 'visibility';
        } else {
            apiKeyInput.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });

    // Guardar API key
    document.getElementById('save-api-key').addEventListener('click', saveAPIKey);
    
    // Permitir guardar con Enter
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveAPIKey();
        }
    });
}

// Cargar estado de API key
async function loadAPIKeyStatus() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        updateAPIStatus(data.gemini_configured, data.message);
        
        if (data.gemini_configured) {
            document.getElementById('gemini-key').placeholder = '••••••••••••••••••••';
        }
    } catch (error) {
        console.error('Error al cargar estado:', error);
        updateAPIStatus(false, 'Error al verificar configuración');
    }
}

// Guardar API key
async function saveAPIKey() {
    const apiKey = document.getElementById('gemini-key').value.trim();
    const saveBtn = document.getElementById('save-api-key');
    
    if (!apiKey) {
        showMessage('Por favor ingresa una API key', 'error');
        return;
    }

    // Validar formato básico
    if (!apiKey.startsWith('AIza')) {
        showMessage('La API key debe comenzar con "AIza"', 'error');
        return;
    }

    // Deshabilitar botón
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Guardando...</span>
    `;

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                gemini_api_key: apiKey
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('✓ API key guardada correctamente', 'success');
            updateAPIStatus(true, 'API configurada correctamente');
            
            // Limpiar input y cambiar placeholder
            document.getElementById('gemini-key').value = '';
            document.getElementById('gemini-key').placeholder = '••••••••••••••••••••';
        } else {
            throw new Error(data.error || 'Error al guardar API key');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('✗ ' + error.message, 'error');
        updateAPIStatus(false, 'Error al configurar API');
    } finally {
        // Restaurar botón
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
            <span class="material-symbols-outlined">save</span>
            Guardar API Key
        `;
    }
}

// Actualizar estado visual de API
function updateAPIStatus(configured, message) {
    const statusEl = document.getElementById('api-status');
    const icon = statusEl.querySelector('.material-symbols-outlined');
    const text = statusEl.querySelector('span:last-child');
    
    if (configured) {
        icon.textContent = 'check_circle';
        icon.className = 'material-symbols-outlined text-lg text-green-600 dark:text-green-500';
        text.textContent = message;
        text.className = 'text-green-600 dark:text-green-500 font-medium';
    } else {
        icon.textContent = 'error';
        icon.className = 'material-symbols-outlined text-lg text-yellow-600 dark:text-yellow-500';
        text.textContent = message;
        text.className = 'text-yellow-600 dark:text-yellow-500';
    }
}

// Mostrar mensaje temporal
function showMessage(message, type) {
    // Crear toast
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 flex items-center gap-2 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    
    const icon = type === 'success' ? 'check_circle' : 'error';
    toast.innerHTML = `
        <span class="material-symbols-outlined">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remover
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Añadir estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-up {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }
`;
document.head.appendChild(style);
