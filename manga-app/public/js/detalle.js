// detalle.js - Pantalla de detalle del manga
// BASE_PATH se define en detalle.html para evitar problemas de timing
const API_URL = `${BASE_PATH}/api`;
let mangaActual = null;

// Obtener el ID del manga de la URL
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('id');

// Cargar el manga al iniciar
document.addEventListener('DOMContentLoaded', () => {
  if (!mangaId) {
    window.location.href = `${BASE_PATH}/index.html`;
    return;
  }
  cargarManga();
});

// Función para cargar el manga
async function cargarManga() {
  try {
    const response = await fetch(`${API_URL}/mangas/${mangaId}`);
    if (!response.ok) {
      if (response.status === 404) {
        alert('Manga no encontrado');
        window.location.href = `${BASE_PATH}/index.html`;
        return;
      }
      throw new Error('Error al cargar manga');
    }
    
    mangaActual = await response.json();
    mostrarManga(mangaActual);
    
    // Si tiene nuevos capítulos, marcar como visto
    if (mangaActual.tieneNuevosCapitulos) {
      await marcarComoVisto();
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar el manga');
    window.location.href = `${BASE_PATH}/index.html`;
  }
}

// Función para marcar nuevos capítulos como vistos
async function marcarComoVisto() {
  try {
    await fetch(`${API_URL}/mangas/${mangaId}/marcar-visto`, {
      method: 'POST'
    });
    console.log('✅ Nuevos capítulos marcados como vistos');
  } catch (error) {
    console.error('Error al marcar como visto:', error);
  }
}

// Función para mostrar los datos del manga
function mostrarManga(manga) {
  // Portada
  const portadaUrl = manga.portadaUrl 
    ? `${BASE_PATH}/covers/${manga.portadaUrl}` 
    : 'https://via.placeholder.com/300x400/1e293b/64748b?text=Sin+Portada';
  
  document.getElementById('cover-image').src = portadaUrl;
  document.getElementById('bg-image').src = portadaUrl;
  
  // Título
  document.getElementById('manga-title').textContent = manga.titulo;
  
  // Estado
  const estadoBadge = obtenerEstadoBadge(manga.estadoLectura);
  const statusBadgeEl = document.getElementById('status-badge');
  statusBadgeEl.className = `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${estadoBadge.clase}`;
  statusBadgeEl.textContent = estadoBadge.texto;
  
  // Capítulo actual
  const capituloTexto = manga.capituloActual 
    ? `Último leído: Cap. ${manga.capituloActual}` 
    : 'No iniciado';
  document.getElementById('chapter-badge').textContent = capituloTexto;
  
  // Enlaces de lectura
  mostrarLinks(manga.links);
  
  // Calificación (estrellas)
  mostrarCalificacion(manga.calificacion);
  
  // Comentario
  mostrarComentario(manga.comentarioOpinion);
  
  // Información de vigilancia
  mostrarVigilancia(manga);
}

// Función para obtener el badge de estado
function obtenerEstadoBadge(estado) {
  const badges = {
    'leyendo': { clase: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', texto: 'Leyendo' },
    'terminado': { clase: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', texto: 'Terminado' },
    'en_pausa': { clase: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', texto: 'En Pausa' },
    'no_empezado': { clase: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', texto: 'No Empezado' }
  };
  return badges[estado] || badges['no_empezado'];
}

// Función para mostrar los links
function mostrarLinks(links) {
  const linksContainer = document.getElementById('links-container');
  const noLinksMsg = document.getElementById('no-links');
  
  if (!links || links.length === 0) {
    linksContainer.innerHTML = '';
    noLinksMsg.classList.remove('hidden');
    return;
  }
  
  noLinksMsg.classList.add('hidden');
  linksContainer.innerHTML = links.map(link => `
    <a class="group flex items-center justify-between rounded-lg bg-gray-200/50 p-4 transition-all duration-200 hover:bg-gray-300/70 hover:shadow-md dark:bg-gray-800/50 dark:hover:bg-gray-700/70" 
       href="${link.url}" 
       target="_blank"
       rel="noopener noreferrer">
      <span class="font-medium text-gray-800 dark:text-gray-200">${link.nombreFuente}</span>
      <button type="button" class="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-transform duration-200 group-hover:scale-105 dark:bg-gray-900 dark:text-white">
        Abrir
        <span class="material-symbols-outlined text-base">open_in_new</span>
      </button>
    </a>
  `).join('');
}

// Función para mostrar la calificación
function mostrarCalificacion(calificacion) {
  const ratingStars = document.getElementById('rating-stars');
  
  if (!calificacion) {
    ratingStars.innerHTML = '<span class="text-gray-500 text-sm">Sin calificación</span>';
    return;
  }
  
  let estrellas = '';
  for (let i = 1; i <= 5; i++) {
    const clase = i <= calificacion ? 'text-yellow-500' : 'text-gray-600';
    estrellas += `<span class="material-symbols-outlined ${clase}">star</span>`;
  }
  ratingStars.innerHTML = estrellas;
}

// Función para mostrar el comentario
function mostrarComentario(comentario) {
  const commentSection = document.getElementById('comment-section');
  const commentText = document.getElementById('comment-text');
  
  if (!comentario || comentario.trim() === '') {
    commentSection.classList.add('hidden');
    return;
  }
  
  commentSection.classList.remove('hidden');
  commentText.textContent = comentario;
}

// Función para mostrar información de vigilancia
function mostrarVigilancia(manga) {
  const vigilanciaSection = document.getElementById('vigilancia-info');
  
  if (!manga.vigilarManga) {
    vigilanciaSection.style.display = 'none';
    return;
  }
  
  vigilanciaSection.style.display = 'block';
  
  // Mostrar capítulos disponibles
  const capsElement = document.getElementById('caps-disponibles');
  if (manga.capitulosDisponibles) {
    capsElement.textContent = manga.capitulosDisponibles;
    capsElement.classList.add('text-green-600', 'dark:text-green-400');
  } else {
    capsElement.textContent = 'Pendiente de actualización';
    capsElement.classList.add('text-gray-500');
  }
  
  // Mostrar próxima fecha
  const fechaElement = document.getElementById('proxima-fecha');
  if (manga.proximaFechaCapitulo) {
    fechaElement.textContent = manga.proximaFechaCapitulo;
    fechaElement.classList.add('text-purple-600', 'dark:text-purple-400');
  } else {
    fechaElement.textContent = 'No disponible';
    fechaElement.classList.add('text-gray-500');
  }
  
  // Mostrar fuente
  const sourceElement = document.getElementById('web-source');
  if (manga.webSource) {
    sourceElement.textContent = manga.webSource;
  } else {
    sourceElement.textContent = 'No configurada';
  }
}

// Función para editar el manga
function editarManga() {
  window.location.href = `${BASE_PATH}/agregar.html?id=${mangaId}`;
}

// Función para eliminar el manga
async function eliminarManga() {
  if (!confirm(`¿Estás seguro de que quieres eliminar "${mangaActual.titulo}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/mangas/${mangaId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Error al eliminar manga');
    
    alert('Manga eliminado correctamente');
    window.location.href = `${BASE_PATH}/index.html`;
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar el manga');
  }
}
