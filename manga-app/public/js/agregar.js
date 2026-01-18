// agregar.js - Formulario para agregar/editar manga
// BASE_PATH se define en agregar.html para evitar problemas de timing
const API_URL = `${BASE_PATH}/api`;

// Variables globales
let mangaId = null;
let portadaFile = null;
let linksArray = [];
let linksToDelete = [];
let calificacionSeleccionada = null;
let isSaving = false;

// Obtener el ID del manga de la URL (si es edición)
const urlParams = new URLSearchParams(window.location.search);
mangaId = urlParams.get('id');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  inicializarFormulario();
  inicializarEstado();
  inicializarCalificacion();
  inicializarPortada();
  inicializarVigilancia();
  
  if (mangaId) {
    document.getElementById('form-title').textContent = 'Editar Manga';
    document.getElementById('submit-btn').innerHTML = `
      <span class="material-symbols-outlined">save</span>
      Guardar Cambios
    `;
    cargarManga();
  }
});

// Inicializar el formulario
function inicializarFormulario() {
  const form = document.getElementById('manga-form');
  form.addEventListener('submit', handleSubmit);
}

// Inicializar selector de estado
function inicializarEstado() {
  const statusContainer = document.getElementById('status-container');
  const statusButtons = statusContainer.querySelectorAll('.status-button');
  const statusPill = document.getElementById('status-pill');
  const hiddenInput = document.getElementById('estadoLectura');
  
  statusButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(button.dataset.index);
      const value = button.dataset.value;
      
      // Mover el pill
      statusPill.style.transform = `translateX(${index * 100}%)`;
      
      // Actualizar colores
      statusButtons.forEach(btn => {
        btn.classList.remove('text-white');
        btn.classList.add('text-slate-400');
      });
      button.classList.remove('text-slate-400');
      button.classList.add('text-white');
      
      // Actualizar valor
      hiddenInput.value = value;
    });
  });
}

// Inicializar sistema de calificación
function inicializarCalificacion() {
  const stars = document.querySelectorAll('.star');
  const hiddenInput = document.getElementById('calificacion');
  
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      calificacionSeleccionada = rating;
      hiddenInput.value = rating;
      actualizarEstrellas(rating);
    });
    
    star.addEventListener('mouseenter', () => {
      const rating = parseInt(star.dataset.rating);
      actualizarEstrellas(rating);
    });
  });
  
  document.getElementById('rating-stars').addEventListener('mouseleave', () => {
    actualizarEstrellas(calificacionSeleccionada || 0);
  });
}

// Actualizar visualización de estrellas
function actualizarEstrellas(rating) {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    const starRating = parseInt(star.dataset.rating);
    if (starRating <= rating) {
      star.classList.add('text-yellow-400');
      star.classList.remove('text-slate-600');
    } else {
      star.classList.remove('text-yellow-400');
      star.classList.add('text-slate-600');
    }
  });
}

// Inicializar preview de portada
function inicializarPortada() {
  const input = document.getElementById('portada-input');
  const preview = document.getElementById('preview-image');
  const dropzoneContent = document.getElementById('dropzone-content');
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      portadaFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        dropzoneContent.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }
  });
}

// Inicializar vigilancia de manga
function inicializarVigilancia() {
  const checkboxVigilar = document.getElementById('vigilarManga');
  const configVigilancia = document.getElementById('vigilancia-config');
  
  checkboxVigilar.addEventListener('change', (e) => {
    if (e.target.checked) {
      configVigilancia.classList.remove('hidden');
    } else {
      configVigilancia.classList.add('hidden');
      // Limpiar campos si se desactiva
      document.getElementById('webSource').value = '';
      document.getElementById('urlSource').value = '';
    }
  });
}

// Agregar input de link
function agregarLinkInput(nombreFuente = '', url = '', linkId = null) {
  const container = document.getElementById('links-container');
  const index = linksArray.length;
  
  const linkDiv = document.createElement('div');
  linkDiv.className = 'flex gap-3 items-center';
  linkDiv.dataset.index = index;
  if (linkId) linkDiv.dataset.linkId = linkId;
  
  linkDiv.innerHTML = `
    <input 
      class="flex-shrink w-1/3 bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-slate-200 dark:text-slate-200 focus:border-indigo-500 focus:ring-indigo-500" 
      placeholder="Nombre del sitio" 
      type="text"
      value="${nombreFuente}"
      data-field="nombreFuente"
    />
    <input 
      class="flex-grow bg-slate-800 border-slate-700 rounded-lg px-4 py-3 text-slate-200 dark:text-slate-200 focus:border-indigo-500 focus:ring-indigo-500" 
      placeholder="https://..." 
      type="url"
      value="${url}"
      data-field="url"
    />
    <button 
      onclick="eliminarLinkInput(${index})" 
      class="p-3 bg-slate-800 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors" 
      type="button"
    >
      <span class="material-symbols-outlined text-xl">delete</span>
    </button>
  `;
  
  container.appendChild(linkDiv);
  linksArray.push({ id: linkId, nombreFuente, url });
}

// Eliminar input de link
function eliminarLinkInput(index) {
  const container = document.getElementById('links-container');
  const linkDiv = container.querySelector(`[data-index="${index}"]`);
  if (linkDiv) {
    const linkId = linkDiv.dataset.linkId;
    if (linkId) {
      linksToDelete.push(parseInt(linkId, 10));
    }
    linkDiv.remove();
    linksArray[index] = null; // Marcar como eliminado
  }
}

// Cargar manga para edición
async function cargarManga() {
  try {
    const response = await fetch(`${API_URL}/mangas/${mangaId}`);
    if (!response.ok) throw new Error('Error al cargar manga');
    
    const manga = await response.json();
    llenarFormulario(manga);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar el manga');
    window.location.href = `${BASE_PATH}/index.html`;
  }
}

// Llenar formulario con datos del manga
function llenarFormulario(manga) {
  document.getElementById('titulo').value = manga.titulo || '';
  document.getElementById('tipo').value = manga.tipo || '';
  document.getElementById('capituloActual').value = manga.capituloActual || '';
  document.getElementById('comentarioOpinion').value = manga.comentarioOpinion || '';
  
  // Estado
  const statusButtons = document.querySelectorAll('.status-button');
  const statusPill = document.getElementById('status-pill');
  statusButtons.forEach(btn => {
    if (btn.dataset.value === manga.estadoLectura) {
      const index = parseInt(btn.dataset.index);
      statusPill.style.transform = `translateX(${index * 100}%)`;
      btn.classList.add('text-white');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('text-white');
      btn.classList.add('text-slate-400');
    }
  });
  document.getElementById('estadoLectura').value = manga.estadoLectura;
  
  // Calificación
  if (manga.calificacion) {
    calificacionSeleccionada = manga.calificacion;
    document.getElementById('calificacion').value = manga.calificacion;
    actualizarEstrellas(manga.calificacion);
  }
  
  // Portada
  if (manga.portadaUrl) {
    const preview = document.getElementById('preview-image');
    preview.src = `${BASE_PATH}/covers/${manga.portadaUrl}`;
    preview.classList.remove('hidden');
    document.getElementById('dropzone-content').classList.add('hidden');
  }
  
  // Links
  if (manga.links && manga.links.length > 0) {
    manga.links.forEach(link => {
      agregarLinkInput(link.nombreFuente, link.url, link.id);
    });
  }
  
  // Vigilancia
  if (manga.vigilarManga) {
    const checkboxVigilar = document.getElementById('vigilarManga');
    const webSourceSelect = document.getElementById('webSource');
    const urlSourceInput = document.getElementById('urlSource');
    const configVigilancia = document.getElementById('vigilancia-config');
    
    checkboxVigilar.checked = true;
    configVigilancia.classList.remove('hidden');
    
    if (manga.webSource) {
      webSourceSelect.value = manga.webSource;
    }
    if (manga.urlSource) {
      urlSourceInput.value = manga.urlSource;
    }
  }
}

// Manejar el envío del formulario
async function handleSubmit(e) {
  e.preventDefault();
  if (isSaving) return; // Evitar doble envío
  isSaving = true;
  
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  
  // Deshabilitar botón y mostrar estado
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70','cursor-not-allowed');
  }
  if (btnSpinner) btnSpinner.classList.remove('hidden');
  if (btnText) btnText.textContent = mangaId ? 'Guardando...' : 'Creando...';
  
  const formData = new FormData(e.target);
  const titulo = formData.get('titulo');
  
  if (!titulo || titulo.trim() === '') {
    alert('El título es obligatorio');
    isSaving = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70','cursor-not-allowed');
    }
    if (btnSpinner) btnSpinner.classList.add('hidden');
    if (btnText) btnText.textContent = 'Guardar';
    return;
  }
  
  try {
    // 1. Crear o actualizar el manga
    let manga;
    if (mangaId) {
      manga = await actualizarManga(formData);
    } else {
      manga = await crearManga(formData);
    }
    
    // 2. Subir portada si hay una nueva
    if (portadaFile && progressContainer && progressBar && progressText) {
      progressContainer.classList.remove('hidden');
      progressBar.style.width = '0%';
      progressText.textContent = '0%';
      await subirPortadaConProgreso(manga.id, portadaFile, (pct) => {
        progressBar.style.width = pct + '%';
        progressText.textContent = pct + '%';
      });
    } else if (portadaFile) {
      // Fallback sin progreso visual
      await subirPortada(manga.id, portadaFile);
    }
    
    // 3. Gestionar links (no detener si falla)
    try {
      await gestionarLinks(manga.id);
    } catch (linkError) {
      console.warn('Error gestionando links (continuando):', linkError);
    }
    
    // Redirigir inmediatamente
    setTimeout(() => {
      window.location.href = `${BASE_PATH}/detalle.html?id=${manga.id}`;
    }, 100);
    return;
  } catch (error) {
    console.error('Error completo:', error);
    const detalles = error.message || error.toString();
    
    // Si el manga ya existe, ofrecer ir a editarlo
    if (error.message && error.message.includes('Ya existe un manga con ese título')) {
      const irAEditar = confirm('⚠️ Ya existe un manga con ese título.\n\n¿Deseas ir a editarlo en lugar de crear uno nuevo?');
      if (irAEditar) {
        // Extraer el ID del manga del error si está disponible
        const match = error.message.match(/mangaId:(\d+)/);
        if (match) {
          window.location.href = `${BASE_PATH}/agregar.html?id=${match[1]}`;
        } else {
          // Si no tenemos el ID, volver al listado
          window.location.href = `${BASE_PATH}/`;
        }
        return;
      }
    }
    
    alert('Error al guardar el manga: ' + detalles);
  } finally {
    isSaving = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70','cursor-not-allowed');
    }
    if (btnSpinner) btnSpinner.classList.add('hidden');
    if (btnText) btnText.textContent = 'Guardar';
  }
}

// Crear manga
async function crearManga(formData) {
  const vigilarManga = document.getElementById('vigilarManga').checked;
  const webSourceValue = formData.get('webSource');
  const urlSourceValue = formData.get('urlSource');
  
  console.log('🔍 Datos de vigilancia capturados:');
  console.log('  - vigilarManga:', vigilarManga);
  console.log('  - webSource:', webSourceValue);
  console.log('  - urlSource:', urlSourceValue);
  
  const data = {
    titulo: formData.get('titulo'),
    tipo: formData.get('tipo') || null,
    estadoLectura: formData.get('estadoLectura'),
    capituloActual: formData.get('capituloActual') || null,
    calificacion: formData.get('calificacion') || null,
    comentarioOpinion: formData.get('comentarioOpinion') || null,
    vigilarManga: vigilarManga,
    webSource: vigilarManga ? (webSourceValue || null) : null,
    urlSource: vigilarManga ? (urlSourceValue || null) : null
  };
  
  console.log('📤 Enviando al backend:', JSON.stringify(data, null, 2));
  
  const response = await fetch(`${API_URL}/mangas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    const errorMsg = error.error || 'Error al crear manga';
    // Si hay mangaId, agregarlo al mensaje para el manejo posterior
    if (error.mangaId) {
      throw new Error(`${errorMsg} mangaId:${error.mangaId}`);
    }
    throw new Error(errorMsg);
  }
  
  return await response.json();
}

// Actualizar manga
async function actualizarManga(formData) {
  const vigilarManga = document.getElementById('vigilarManga').checked;
  const webSourceValue = formData.get('webSource');
  const urlSourceValue = formData.get('urlSource');
  
  console.log('🔍 Datos de vigilancia capturados (update):');
  console.log('  - vigilarManga:', vigilarManga);
  console.log('  - webSource:', webSourceValue);
  console.log('  - urlSource:', urlSourceValue);
  
  const data = {
    titulo: formData.get('titulo'),
    tipo: formData.get('tipo') || null,
    estadoLectura: formData.get('estadoLectura'),
    capituloActual: formData.get('capituloActual') || null,
    calificacion: formData.get('calificacion') || null,
    comentarioOpinion: formData.get('comentarioOpinion') || null,
    vigilarManga: vigilarManga,
    webSource: vigilarManga ? (webSourceValue || null) : null,
    urlSource: vigilarManga ? (urlSourceValue || null) : null
  }
  
  console.log('📤 Enviando al backend (update):', JSON.stringify(data, null, 2));
  
  const response = await fetch(`${API_URL}/mangas/${mangaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar manga');
  }
  
  return await response.json();
}

// Subir portada
async function subirPortada(id, file) {
  const formData = new FormData();
  formData.append('portada', file);
  
  const response = await fetch(`${API_URL}/mangas/${id}/portada`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al subir portada');
  }
  
  return await response.json();
}

// Subir portada con progreso real usando XHR
function subirPortadaConProgreso(id, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/mangas/${id}/portada`, true);
    xhr.responseType = 'json';

    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable && typeof onProgress === 'function') {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(xhr.response?.error || 'Error al subir portada'));
      }
    };

    xhr.onerror = function () {
      reject(new Error('Error de red subiendo portada'));
    };

    const formData = new FormData();
    formData.append('portada', file);
    xhr.send(formData);
  });
}

// Gestionar links (crear/actualizar/eliminar)
async function gestionarLinks(mangaIdToUse) {
  const container = document.getElementById('links-container');
  if (!container) {
    console.log('No hay contenedor de links');
    return;
  }
  
  const linkDivs = container.querySelectorAll('[data-index]');
  console.log(`Gestionando ${linkDivs.length} links`);

  // 1) Eliminar los que el usuario borró
  for (const id of linksToDelete) {
    try { 
      console.log('Eliminando link', id);
      await eliminarLink(id); 
    } catch (e) { 
      console.warn('Error eliminando link', id, e);
    }
  }
  linksToDelete = [];

  // 2) Crear/Actualizar actuales en el DOM
  for (const linkDiv of linkDivs) {
    try {
      const nombreInput = linkDiv.querySelector('[data-field="nombreFuente"]');
      const urlInput = linkDiv.querySelector('[data-field="url"]');
      
      if (!nombreInput || !urlInput) {
        console.warn('Inputs no encontrados en link div');
        continue;
      }
      
      const nombreFuente = (nombreInput.value || '').trim();
      const url = (urlInput.value || '').trim();
      const linkId = linkDiv.dataset.linkId ? parseInt(linkDiv.dataset.linkId, 10) : null;

      if (!nombreFuente && !url) continue; // vacío, ignorar

      if (linkId) {
        // Actualizar existente
        console.log('Actualizando link', linkId);
        await actualizarLink(linkId, { nombreFuente, url });
      } else if (nombreFuente && url) {
        // Crear nuevo
        console.log('Creando link nuevo');
        const nuevo = await crearLink(mangaIdToUse, nombreFuente, url);
        if (nuevo?.id) linkDiv.dataset.linkId = nuevo.id;
      }
    } catch (e) {
      console.error('Error procesando link individual:', e);
    }
  }
}

// Crear link
async function crearLink(mangaIdToUse, nombreFuente, url) {
  const data = { nombreFuente, url };
  
  const response = await fetch(`${API_URL}/mangas/${mangaIdToUse}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al crear link');
  }
  
  return await response.json();
}

async function actualizarLink(linkId, data) {
  const response = await fetch(`${API_URL}/links/${linkId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al actualizar link');
  }
  return await response.json();
}

async function eliminarLink(linkId) {
  const response = await fetch(`${API_URL}/links/${linkId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al eliminar link');
  }
  return true;
}
