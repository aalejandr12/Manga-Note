// Estado global
let todasLasCarpetas = [];
let carpetaSeleccionadaAgregar = '';
let carpetaSeleccionadaEliminar = '';

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCarpetas();
    inicializarEventos();
});

/**
 * Cargar lista de carpetas de mangas
 */
async function cargarCarpetas() {
    try {
        const response = await fetch(`${BASE_PATH}/api/files/carpetas`);
        if (!response.ok) throw new Error('Error al cargar carpetas');

        const data = await response.json();
        todasLasCarpetas = data.carpetas || [];
        console.log(`📁 Cargadas ${todasLasCarpetas.length} carpetas`);
    } catch (error) {
        console.error('Error al cargar carpetas:', error);
        mostrarNotificacion('Error al cargar carpetas', 'error');
    }
}

/**
 * Inicializar todos los event listeners
 */
function inicializarEventos() {
    // Formulario: Subir nuevo manga
    document.getElementById('form-nuevo-manga').addEventListener('submit', subirNuevoManga);

    // Autocomplete: Agregar capítulo
    const inputAgregar = document.getElementById('carpeta-existente');
    inputAgregar.addEventListener('input', (e) => filtrarYMostrarSugerencias(e.target.value, 'agregar'));
    inputAgregar.addEventListener('focus', () => {
        if (inputAgregar.value) filtrarYMostrarSugerencias(inputAgregar.value, 'agregar');
    });

    // Click fuera para cerrar autocomplete
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#carpeta-existente') && !e.target.closest('#autocomplete-agregar')) {
            document.getElementById('autocomplete-agregar').classList.add('hidden');
        }
        if (!e.target.closest('#carpeta-eliminar') && !e.target.closest('#autocomplete-eliminar')) {
            document.getElementById('autocomplete-eliminar').classList.add('hidden');
        }
    });

    // Formulario: Agregar capítulo
    document.getElementById('form-agregar-capitulo').addEventListener('submit', agregarCapitulo);

    // Autocomplete: Eliminar
    const inputEliminar = document.getElementById('carpeta-eliminar');
    inputEliminar.addEventListener('input', (e) => filtrarYMostrarSugerencias(e.target.value, 'eliminar'));
    inputEliminar.addEventListener('focus', () => {
        if (inputEliminar.value) filtrarYMostrarSugerencias(inputEliminar.value, 'eliminar');
    });

    // Formulario: Eliminar
    document.getElementById('form-eliminar').addEventListener('submit', eliminarArchivo);
}

/**
 * Filtrar carpetas y mostrar sugerencias
 */
function filtrarYMostrarSugerencias(query, tipo) {
    const dropdown = document.getElementById(`autocomplete-${tipo}`);

    if (!query) {
        dropdown.classList.add('hidden');
        return;
    }

    // Filtrar carpetas (búsqueda insensible a mayúsculas)
    const carpetasFiltradas = todasLasCarpetas.filter(carpeta =>
        carpeta.toLowerCase().includes(query.toLowerCase())
    );

    // Mostrar sugerencias
    if (carpetasFiltradas.length === 0) {
        dropdown.innerHTML = '<div class="px-4 py-2 text-gray-500 text-sm">No se encontraron carpetas</div>';
        dropdown.classList.remove('hidden');
    } else {
        dropdown.innerHTML = carpetasFiltradas
            .slice(0, 50) // Limitar a 50 resultados
            .map(carpeta => `
        <div class="autocomplete-item px-4 py-2 cursor-pointer text-sm" 
             data-carpeta="${carpeta}"
             onclick="seleccionarCarpeta('${tipo}', '${carpeta.replace(/'/g, "\\'")}')">
          <span class="material-symbols-outlined text-xs align-middle mr-2">folder</span>
          ${carpeta}
        </div>
      `)
            .join('');
        dropdown.classList.remove('hidden');
    }
}

/**
 * Seleccionar carpeta del autocomplete
 */
async function seleccionarCarpeta(tipo, nombreCarpeta) {
    const input = document.getElementById(`carpeta-${tipo === 'agregar' ? 'existente' : 'eliminar'}`);
    const dropdown = document.getElementById(`autocomplete-${tipo}`);

    input.value = nombreCarpeta;
    dropdown.classList.add('hidden');

    if (tipo === 'agregar') {
        carpetaSeleccionadaAgregar = nombreCarpeta;
    } else if (tipo === 'eliminar') {
        carpetaSeleccionadaEliminar = nombreCarpeta;
        await cargarArchivosParaEliminar(nombreCarpeta);
    }
}

/**
 * Cargar archivos PDF de una carpeta para eliminar
 */
async function cargarArchivosParaEliminar(carpeta) {
    try {
        const response = await fetch(`${BASE_PATH}/api/files/carpetas/${encodeURIComponent(carpeta)}`);
        if (!response.ok) throw new Error('Error al cargar archivos');

        const data = await response.json();
        const select = document.getElementById('archivo-eliminar');
        const container = document.getElementById('container-archivos-eliminar');
        const btnEliminar = document.getElementById('btn-eliminar');

        select.innerHTML = '<option value="">Selecciona un archivo...</option>';

        if (data.archivos && data.archivos.length > 0) {
            data.archivos.forEach(archivo => {
                const option = document.createElement('option');
                option.value = archivo;
                option.textContent = archivo;
                select.appendChild(option);
            });

            container.classList.remove('hidden');
            btnEliminar.disabled = false;
        } else {
            container.classList.add('hidden');
            btnEliminar.disabled = true;
            mostrarNotificacion('Esta carpeta no tiene archivos PDF', 'info');
        }
    } catch (error) {
        console.error('Error al cargar archivos:', error);
        mostrarNotificacion('Error al cargar archivos', 'error');
    }
}

/**
 * Subir nuevo manga
 */
async function subirNuevoManga(e) {
    e.preventDefault();

    const nombreManga = document.getElementById('nombre-manga-nuevo').value.trim();
    const archivo = document.getElementById('archivo-nuevo').files[0];

    if (!nombreManga || !archivo) {
        mostrarNotificacion('Por favor completa todos los campos', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('nombreManga', nombreManga);
    formData.append('archivo', archivo);

    const btnSubmit = document.getElementById('btn-subir-nuevo');
    const btnContent = document.getElementById('btn-content-nuevo');
    const progressContainer = document.getElementById('progress-nuevo');
    const progressBar = document.getElementById('progress-bar-nuevo');
    const progressText = document.getElementById('progress-text-nuevo');

    try {
        btnSubmit.disabled = true;
        btnSubmit.classList.remove('hover:bg-green-700');
        btnSubmit.classList.add('cursor-wait', 'pb-6');
        progressContainer.classList.remove('hidden');

        const xhr = new XMLHttpRequest();

        // Progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                progressText.textContent = `${percent}% (${formatBytes(e.loaded)} / ${formatBytes(e.total)})`;
            }
        });

        // Completado
        xhr.addEventListener('load', async () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                mostrarNotificacion(`✅ Manga "${nombreManga}" subido exitosamente`, 'success');
                document.getElementById('form-nuevo-manga').reset();
                progressContainer.classList.add('hidden');
                progressBar.style.width = '0%';
                btnSubmit.classList.remove('cursor-wait', 'pb-6');
                btnSubmit.classList.add('hover:bg-green-700');
                // Recargar carpetas
                await cargarCarpetas();
            } else {
                throw new Error('Error al subir archivo');
            }
        });

        // Error
        xhr.addEventListener('error', () => {
            throw new Error('Error de conexión');
        });

        xhr.open('POST', `${BASE_PATH}/api/files/subir-nuevo`);
        xhr.send(formData);

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al subir manga', 'error');
    } finally {
        btnSubmit.disabled = false;
    }
}

/**
 * Agregar capítulo a serie existente
 */
async function agregarCapitulo(e) {
    e.preventDefault();

    const carpeta = carpetaSeleccionadaAgregar || document.getElementById('carpeta-existente').value.trim();
    const archivo = document.getElementById('archivo-capitulo').files[0];

    if (!carpeta || !archivo) {
        mostrarNotificacion('Por favor completa todos los campos', 'error');
        return;
    }

    // Verificar que la carpeta existe
    if (!todasLasCarpetas.includes(carpeta)) {
        mostrarNotificacion('La carpeta seleccionada no existe. Por favor elige una carpeta válida.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('carpeta', carpeta);
    formData.append('archivo', archivo);

    const btnSubmit = document.getElementById('btn-agregar-capitulo');
    const btnContent = document.getElementById('btn-content-capitulo');
    const progressContainer = document.getElementById('progress-capitulo');
    const progressBar = document.getElementById('progress-bar-capitulo');
    const progressText = document.getElementById('progress-text-capitulo');

    try {
        btnSubmit.disabled = true;
        btnSubmit.classList.remove('hover:bg-blue-700');
        btnSubmit.classList.add('cursor-wait', 'pb-6');
        progressContainer.classList.remove('hidden');

        const xhr = new XMLHttpRequest();

        // Progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                progressText.textContent = `${percent}% (${formatBytes(e.loaded)} / ${formatBytes(e.total)})`;
            }
        });

        // Completado
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                mostrarNotificacion(`✅ Capítulo agregado a "${carpeta}"`, 'success');
                document.getElementById('form-agregar-capitulo').reset();
                carpetaSeleccionadaAgregar = '';
                progressContainer.classList.add('hidden');
                progressBar.style.width = '0%';
                btnSubmit.classList.remove('cursor-wait', 'pb-6');
                btnSubmit.classList.add('hover:bg-blue-700');
            } else {
                throw new Error('Error al agregar capítulo');
            }
        });

        // Error
        xhr.addEventListener('error', () => {
            throw new Error('Error de conexión');
        });

        xhr.open('POST', `${BASE_PATH}/api/files/agregar-capitulo`);
        xhr.send(formData);

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al agregar capítulo', 'error');
    } finally {
        btnSubmit.disabled = false;
    }
}

/**
 * Eliminar archivo
 */
async function eliminarArchivo(e) {
    e.preventDefault();

    const carpeta = carpetaSeleccionadaEliminar;
    const archivo = document.getElementById('archivo-eliminar').value;

    if (!carpeta || !archivo) {
        mostrarNotificacion('Por favor selecciona carpeta y archivo', 'error');
        return;
    }

    // Confirmación con modal personalizado
    const confirmado = await mostrarConfirmacion(
        'Eliminar archivo',
        `¿Estás seguro de eliminar "${archivo}" de la carpeta "${carpeta}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmado) {
        return;
    }

    try {
        const response = await fetch(`${BASE_PATH}/api/files/eliminar`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ carpeta, archivo })
        });

        if (!response.ok) throw new Error('Error al eliminar archivo');

        const data = await response.json();
        mostrarNotificacion(`✅ Archivo "${archivo}" eliminado`, 'success');

        // Recargar archivos de la carpeta
        await cargarArchivosParaEliminar(carpeta);

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al eliminar archivo', 'error');
    }
}

/**
 * Formatear bytes a formato legible
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Mostrar notificación temporal
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    const colores = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const iconos = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };

    const notif = document.createElement('div');
    notif.className = `fixed top-4 right-4 ${colores[tipo]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300 flex items-center gap-2`;
    notif.innerHTML = `
    <span class="material-symbols-outlined">${iconos[tipo]}</span>
    <span>${mensaje}</span>
  `;

    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

/**
 * Mostrar modal de confirmación personalizado
 */
function mostrarConfirmacion(titulo, mensaje) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        titleEl.textContent = titulo;
        messageEl.textContent = mensaje;
        modal.classList.remove('hidden');

        const handleOk = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);

        // Cerrar con ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}
