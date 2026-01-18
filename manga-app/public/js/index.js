// index.js - Pantalla principal con lista de mangas con scroll infinito
// BASE_PATH se define en index.html para evitar problemas de timing
const API_URL = `${BASE_PATH}/api`;

let todosLosMangas = [];
let mangasFiltrados = [];
let mangasRenderizados = [];
let estadoActual = 'todos';
let terminoBusqueda = '';
let indiceCarga = 0;
const BATCH_SIZE = 20; // Cuántos mangas cargar por vez
let cargando = false;
let finalizarCarga = false;

// Cargar todos los mangas al iniciar
document.addEventListener('DOMContentLoaded', () => {
  configurarObservadores();
  cargarMangas();
  verificarNuevosCapitulos();
});

// Verificar si hay mangas con nuevos capítulos y mostrar notificación
async function verificarNuevosCapitulos() {
  // Esperar un poco para que se cargue todo
  setTimeout(async () => {
    try {
      const response = await fetch(`${API_URL}/mangas/nuevos`);
      if (!response.ok) return;
      
      const mangasNuevos = await response.json();
      
      if (mangasNuevos.length > 0 && typeof mostrarNotificacionLocal === 'function') {
        // Verificar si ya mostramos notificación recientemente
        const ultimaNotif = localStorage.getItem('ultima_notificacion');
        const ahora = Date.now();
        
        // Solo mostrar si pasaron más de 5 minutos desde la última
        if (!ultimaNotif || (ahora - parseInt(ultimaNotif)) > 5 * 60 * 1000) {
          for (const manga of mangasNuevos) {
            await notificarNuevosCapitulos(manga);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seg entre notificaciones
          }
          localStorage.setItem('ultima_notificacion', ahora.toString());
        }
      }
    } catch (error) {
      console.error('Error verificando nuevos capítulos:', error);
    }
  }, 2000);
}

// Función para cargar todos los mangas desde el servidor
async function cargarMangas() {
  try {
    mostrarSkeletonInicial();
    const response = await fetch(`${API_URL}/mangas`);
    if (!response.ok) throw new Error('Error al cargar mangas');
    
    todosLosMangas = await response.json();
    aplicarFiltro();
  } catch (error) {
    console.error('Error:', error);
    mostrarError('No se pudieron cargar los mangas');
  }
}

// Función para aplicar filtro por estado y búsqueda
function aplicarFiltro() {
  // Resetear estado de carga
  indiceCarga = 0;
  cargando = false;
  finalizarCarga = false;
  mangasRenderizados = [];
  
  // Mostrar skeleton mientras filtra (solo si hay búsqueda o cambio de filtro)
  if (terminoBusqueda.trim() !== '' || estadoActual !== 'todos') {
    mostrarSkeletonBusqueda();
  }
  
  // Aplicar filtros con delay para mostrar skeleton
  setTimeout(() => {
    mangasFiltrados = todosLosMangas;
    
    if (estadoActual !== 'todos') {
      mangasFiltrados = todosLosMangas.filter(manga => manga.estadoLectura === estadoActual);
    }
    
    if (terminoBusqueda && terminoBusqueda.trim() !== '') {
      const q = normalizarTexto(terminoBusqueda.trim());
      mangasFiltrados = mangasFiltrados.filter(m => normalizarTexto(m.titulo || '').includes(q));
    }
    
    // Limpiar grid y cargar primer lote
    limpiarGrid();
    cargarSiguienteLote();
  }, terminoBusqueda.trim() !== '' ? 200 : 0); // Delay solo para búsqueda
}

// Función para cambiar filtro
function filtrarPorEstado(estado) {
  estadoActual = estado;
  
  // Actualizar estilos de botones
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    if (btn.dataset.estado === estado) {
      btn.classList.remove('bg-gray-600', 'dark:bg-gray-700');
      btn.classList.add('bg-primary');
    } else {
      btn.classList.remove('bg-primary');
      btn.classList.add('bg-gray-600', 'dark:bg-gray-700');
    }
  });
  
  aplicarFiltro();
}

// Función para mostrar/ocultar filtros
function toggleFiltros() {
  const filtrosContainer = document.getElementById('filtros-container');
  filtrosContainer.classList.toggle('hidden');
}

// Mostrar/ocultar buscador
function toggleBusqueda() {
  const cont = document.getElementById('search-container');
  cont.classList.toggle('hidden');
  if (!cont.classList.contains('hidden')) {
    const input = document.getElementById('search-input');
    setTimeout(() => input && input.focus(), 0);
  }
}

// Limpiar búsqueda
function limpiarBusqueda() {
  terminoBusqueda = '';
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  aplicarFiltro();
}

// Función para cargar el siguiente lote de mangas
function cargarSiguienteLote() {
  if (cargando || finalizarCarga) return;
  
  cargando = true;
  mostrarIndicadorCarga();
  
  // Simular delay para mostrar skeleton (opcional)
  setTimeout(() => {
    const grid = document.getElementById('mangas-grid');
    const emptyState = document.getElementById('empty-state');
    
    // Si no hay mangas filtrados, mostrar empty state
    if (mangasFiltrados.length === 0) {
      grid.classList.add('hidden');
      emptyState.classList.remove('hidden');
      ocultarIndicadorCarga();
      cargando = false;
      return;
    }
    
    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    // Calcular el siguiente lote
    const siguienteIndice = indiceCarga + BATCH_SIZE;
    const loteMangas = mangasFiltrados.slice(indiceCarga, siguienteIndice);
    
    // Si no hay más mangas, marcar como finalizado
    if (loteMangas.length === 0) {
      finalizarCarga = true;
      ocultarIndicadorCarga();
      cargando = false;
      return;
    }
    
    // Agregar mangas al grid
    loteMangas.forEach(manga => {
      const tarjeta = crearTarjetaManga(manga);
      grid.insertAdjacentHTML('beforeend', tarjeta);
      mangasRenderizados.push(manga);
    });
    
    // Actualizar índice
    indiceCarga = siguienteIndice;
    
    // Si llegamos al final, marcar como finalizado
    if (indiceCarga >= mangasFiltrados.length) {
      finalizarCarga = true;
    }
    
    // Cargar imágenes del nuevo lote
    cargarImagenesLazy();
    
    ocultarIndicadorCarga();
    cargando = false;
  }, 300); // Delay para mostrar el skeleton
}

// Función para limpiar el grid
function limpiarGrid() {
  const grid = document.getElementById('mangas-grid');
  grid.innerHTML = '';
}

// Función para mostrar skeleton inicial
function mostrarSkeletonInicial() {
  const grid = document.getElementById('mangas-grid');
  grid.innerHTML = '';
  
  // Mostrar 8 skeleton cards iniciales
  for (let i = 0; i < 8; i++) {
    grid.insertAdjacentHTML('beforeend', crearSkeletonCard());
  }
}

// Función para mostrar skeleton durante búsqueda
function mostrarSkeletonBusqueda() {
  const grid = document.getElementById('mangas-grid');
  grid.innerHTML = '';
  
  // Mostrar 6 skeleton cards para búsqueda
  for (let i = 0; i < 6; i++) {
    grid.insertAdjacentHTML('beforeend', crearSkeletonCard());
  }
}

// Función para crear skeleton card
function crearSkeletonCard() {
  return `
    <div class="skeleton-card relative overflow-hidden rounded-lg shadow-lg">
      <div class="skeleton-image"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      <div class="absolute inset-0 p-3 flex flex-col justify-end">
        <div class="skeleton-text skeleton-text-lg w-3/4"></div>
        <div class="skeleton-text skeleton-text-sm w-1/2"></div>
      </div>
    </div>
  `;
}

// Función para mostrar/ocultar indicador de carga
function mostrarIndicadorCarga() {
  const indicator = document.getElementById('loading-indicator');
  indicator.classList.remove('hidden');
}

function ocultarIndicadorCarga() {
  const indicator = document.getElementById('loading-indicator');
  indicator.classList.add('hidden');
}

// Función para crear el HTML de una tarjeta de manga con lazy loading mejorado
function crearTarjetaManga(manga) {
  const portadaUrl = manga.portadaUrl 
    ? `${BASE_PATH}/covers/${manga.portadaUrl}` 
    : null;
  
  const estadoBadge = obtenerEstadoBadge(manga.estadoLectura);
  const calificacionTexto = obtenerCalificacionTexto(manga.calificacion);
  const capituloTexto = manga.capituloActual ? `Cap. ${manga.capituloActual}` : 'Sin iniciar';
  
  // ID único para cada imagen
  const imageId = `manga-img-${manga.id}`;
  
  return `
    <div onclick="verDetalle(${manga.id})" class="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-gray-800">
      <div class="relative w-full h-64 overflow-hidden">
        ${portadaUrl ? `
          <img 
            id="${imageId}"
            alt="Portada de ${manga.titulo}" 
            class="manga-image w-full h-full object-cover transition-all duration-300 group-hover:scale-105" 
            data-src="${portadaUrl}"
            data-manga-id="${manga.id}"
            loading="lazy"
          />
        ` : ''}
        <div class="absolute inset-0 skeleton-image ${portadaUrl ? 'image-placeholder' : ''}"></div>
        <div class="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 ${portadaUrl ? 'image-fallback hidden' : ''}">
          <div class="text-center">
            <span class="material-symbols-outlined text-4xl mb-2 opacity-50">image</span>
            <p class="text-xs opacity-75">Sin portada</p>
          </div>
        </div>
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      <div class="absolute inset-0 p-3 flex flex-col justify-end">
        <span class="absolute top-2 left-2 ${estadoBadge.clase} text-white text-xs font-semibold px-2 py-1 rounded-full">
          ${estadoBadge.texto}
        </span>
        ${manga.tieneNuevosCapitulos ? `
          <span class="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
            ✨ NEW
          </span>
        ` : ''}
        <h2 class="text-white font-bold text-base leading-tight line-clamp-2">${manga.titulo}</h2>
        ${manga.calificacion ? `
          <div class="flex items-center space-x-1 mt-1">
            <span class="material-symbols-outlined text-pink-500 text-sm">favorite</span>
            <span class="text-pink-400 text-xs">${calificacionTexto}</span>
          </div>
        ` : `<p class="text-gray-300 text-xs mt-1">${capituloTexto}</p>`}
      </div>
    </div>
  `;
}

// Función para obtener el badge de estado
function obtenerEstadoBadge(estado) {
  const badges = {
    'leyendo': { clase: 'bg-blue-500', texto: 'Leyendo' },
    'terminado': { clase: 'bg-green-500', texto: 'Terminado' },
    'en_pausa': { clase: 'bg-orange-500', texto: 'En Pausa' },
    'no_empezado': { clase: 'bg-gray-600', texto: 'No Empezado' }
  };
  return badges[estado] || badges['no_empezado'];
}

// Función para obtener texto de calificación
function obtenerCalificacionTexto(calificacion) {
  if (!calificacion) return '';
  if (calificacion >= 4) return 'Me encanta';
  if (calificacion === 3) return 'Está bien';
  return 'No me gustó';
}

// Función para redirigir al detalle del manga
function verDetalle(mangaId) {
  window.location.href = `${BASE_PATH}/detalle.html?id=${mangaId}`;
}

// Función para mostrar errores
function mostrarError(mensaje) {
  const grid = document.getElementById('mangas-grid');
  grid.innerHTML = `
    <div class="col-span-2 text-center py-8">
      <span class="material-symbols-outlined text-6xl text-red-400 mb-2">error</span>
      <p class="text-red-400">${mensaje}</p>
    </div>
  `;
}

// Configurar observadores para scroll infinito e imágenes lazy
function configurarObservadores() {
  // Observer para scroll infinito
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !cargando && !finalizarCarga) {
        cargarSiguienteLote();
      }
    });
  }, {
    rootMargin: '100px' // Cargar cuando el sentinel esté a 100px de ser visible
  });
  
  // Observar el sentinel
  const sentinel = document.getElementById('scroll-sentinel');
  if (sentinel) {
    scrollObserver.observe(sentinel);
  }
  
  // Configurar listener de búsqueda
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let timeoutId;
    searchInput.addEventListener('input', (e) => {
      terminoBusqueda = e.target.value;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => aplicarFiltro(), 300); // Debounce más largo
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        limpiarBusqueda();
      }
    });
  }
}

// Lazy loading de imágenes mejorado con retry
function cargarImagenesLazy() {
  const imagenesLazy = document.querySelectorAll('img.manga-image:not(.loaded):not(.error)');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        cargarImagen(img);
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px'
  });
  
  imagenesLazy.forEach(img => imageObserver.observe(img));
}

// Función para cargar una imagen individual con fallback
function cargarImagen(img) {
  const mangaId = img.dataset.mangaId;
  const card = img.closest('.group');
  const placeholder = card.querySelector('.image-placeholder');
  const fallback = card.querySelector('.image-fallback');
  
  img.onload = function() {
    img.classList.add('loaded');
    if (placeholder) placeholder.remove();
    if (fallback) fallback.classList.add('hidden');
  };
  
  img.onerror = function() {
    img.classList.add('error');
    if (placeholder) placeholder.remove();
    if (fallback) fallback.classList.remove('hidden');
    
    // Retry después de 2 segundos
    setTimeout(() => {
      if (!img.classList.contains('loaded')) {
        img.src = img.dataset.src + '?retry=' + Date.now();
      }
    }, 2000);
  };
  
  // Comenzar a cargar la imagen
  if (img.dataset.src) {
    img.src = img.dataset.src;
  }
}

// Observar cambios en el DOM para cargar nuevas imágenes
const domObserver = new MutationObserver(() => {
  cargarImagenesLazy();
});

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('mangas-grid');
  if (grid) {
    domObserver.observe(grid, {
      childList: true,
      subtree: true
    });
  }
});

// Normalizar texto para búsqueda acento-insensible
function normalizarTexto(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .trim();
}

// Detectar cuando la página vuelve a estar visible (usuario regresa a la app)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('App visible, verificando nuevos capítulos...');
    verificarNuevosCapitulos();
  }
});
