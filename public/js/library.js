// library.js - Frontend para la biblioteca de mangas

let allSeries = [];
let currentFilter = 'all';
let searchQuery = '';

// Función para renderizar una página de PDF como imagen
async function renderPDFPageToImage(volumeId, pageNumber, maxWidth = 400) {
    try {
        // Obtener la ruta del PDF
        const response = await fetch(`/api/volumes/${volumeId}`);
        const volume = await response.json();
        
        if (!volume || !volume.file_path) {
            throw new Error('No se encontró el volumen');
        }
        
        // Cargar el PDF
        const loadingTask = pdfjsLib.getDocument(volume.file_path);
        const pdf = await loadingTask.promise;
        
        // Obtener la página
        const page = await pdf.getPage(pageNumber);
        
        // Calcular escala para ajustar al ancho deseado
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = maxWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        
        // Renderizar
        await page.render({
            canvasContext: context,
            viewport: scaledViewport
        }).promise;
        
        // Convertir a data URL
        return canvas.toDataURL('image/jpeg', 0.9);
        
    } catch (error) {
        console.error('Error al renderizar página del PDF:', error);
        return null;
    }
}

// Función para extraer páginas de PDFs usando PDF.js
async function extractPagesFromVolumes(volumes) {
    const pages = [];
    const maxVolumes = Math.min(volumes.length, 10); // Máximo 10 volúmenes
    
    for (let i = 0; i < maxVolumes; i++) {
        const volume = volumes[i];
        
        try {
            // Cargar el PDF
            const loadingTask = pdfjsLib.getDocument(volume.file_path);
            const pdf = await loadingTask.promise;
            
            const pageCount = pdf.numPages;
            const pagesToExtract = Math.min(2, pageCount); // Máximo 2 páginas por PDF
            
            // Extraer las primeras 2 páginas
            for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
                try {
                    const page = await pdf.getPage(pageNum);
                    
                    // Configurar el canvas para renderizar
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    // Renderizar la página
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    // Convertir a data URL
                    const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
                    
                    pages.push({
                        url: imageUrl,
                        label: `${volume.label} - Pág. ${pageNum}`,
                        volumeId: volume.id,
                        pageNumber: pageNum
                    });
                    
                } catch (pageError) {
                    console.warn(`Error extrayendo página ${pageNum} de ${volume.label}:`, pageError);
                }
            }
            
        } catch (volumeError) {
            console.warn(`Error procesando volumen ${volume.label}:`, volumeError);
        }
    }
    
    return pages;
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    loadLibrary();
    setupEventListeners();
    loadStats();
    startProcessingStatusPolling();
});

// Configurar event listeners
function setupEventListeners() {
    // Filtros
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            // Actualizar UI
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            // Aplicar filtro
            currentFilter = chip.dataset.filter;
            filterAndRenderLibrary();
        });
    });

    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            filterAndRenderLibrary();
        });
    }
}

// Cargar estadísticas
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('totalSeries').textContent = stats.total_series || 0;
        document.getElementById('totalVolumes').textContent = stats.total_volumes || 0;
        document.getElementById('completedVolumes').textContent = stats.completed_volumes || 0;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Cargar biblioteca desde el servidor
async function loadLibrary() {
    try {
        const response = await fetch('/api/series');
        allSeries = await response.json();
        
        filterAndRenderLibrary();
    } catch (error) {
        console.error('Error al cargar biblioteca:', error);
        showError('Error al cargar la biblioteca');
    }
}

// Filtrar y renderizar la biblioteca
function filterAndRenderLibrary() {
    let filtered = allSeries;

    // Aplicar filtro según estado de lectura del usuario
    if (currentFilter === 'pending') {
        // En Espera - mangas que el usuario marcó como pendientes
        filtered = filtered.filter(s => (s.reading_status || 'pending') === 'pending');
    } else if (currentFilter === 'reading') {
        // Continuar - mangas que el usuario está leyendo actualmente
        filtered = filtered.filter(s => s.reading_status === 'reading');
    } else if (currentFilter === 'completed') {
        // Terminado - mangas que el usuario marcó como terminados
        filtered = filtered.filter(s => s.reading_status === 'completed');
    }
    // 'all' no filtra nada

    // Aplicar búsqueda
    if (searchQuery) {
        filtered = filtered.filter(s => 
            s.title.toLowerCase().includes(searchQuery) ||
            (s.author && s.author.toLowerCase().includes(searchQuery))
        );
    }

    renderLibrary(filtered);
}

// Renderizar la biblioteca
function renderLibrary(series) {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const libraryGrid = document.getElementById('libraryGrid');

    // Ocultar loading
    loadingState.style.display = 'none';

    if (series.length === 0) {
        // Mostrar estado vacío
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
        libraryGrid.classList.add('hidden');
        return;
    }

    // Mostrar grid
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    libraryGrid.classList.remove('hidden');

    // Renderizar series
    libraryGrid.innerHTML = series.map(s => createSeriesCard(s)).join('');
    
    // Renderizar portadas de PDF de forma asíncrona
    renderPDFCovers(series);
}

// Renderizar portadas que son referencias a páginas de PDF
async function renderPDFCovers(series) {
    for (const s of series) {
        if (s.cover_image && s.cover_image.startsWith('pdf:')) {
            const [, volumeId, pageNumber] = s.cover_image.split(':');
            
            try {
                const imageUrl = await renderPDFPageToImage(parseInt(volumeId), parseInt(pageNumber), 400);
                
                if (imageUrl) {
                    // Actualizar todas las imágenes de portada de esta serie
                    const elements = document.querySelectorAll(`[data-series-id="${s.id}"]`);
                    elements.forEach(el => {
                        if (el.style.backgroundImage) {
                            el.style.backgroundImage = `url('${imageUrl}')`;
                        }
                        if (el.tagName === 'IMG') {
                            el.src = imageUrl;
                        }
                    });
                }
            } catch (error) {
                console.error(`Error al renderizar portada PDF para serie ${s.id}:`, error);
            }
        }
    }
}

// Crear tarjeta de serie
function createSeriesCard(series) {
    const isMultiVolume = series.volume_count > 1;
    // Progreso basado en páginas si está disponible
    const totalPages = series.total_pages_sum || 0;
    const currentPages = series.current_pages_sum || 0;
    const progressPages = totalPages > 0 ? (currentPages / totalPages) * 100 : 0;
    const progressPercent = Math.round(progressPages); // Porcentaje leído
    const hasProgress = totalPages > 0 && (currentPages > 0);

    // Usar portada real o placeholder
    let coverImage;
    let needsPDFRender = false;
    
    if (series.cover_image && series.cover_image !== 'null') {
        // Verificar si es una referencia a página de PDF
        if (series.cover_image.startsWith('pdf:')) {
            // Formato: pdf:volumeId:pageNumber
            const [, volumeId, pageNumber] = series.cover_image.split(':');
            needsPDFRender = true;
            coverImage = series.cover_image; // Guardar la referencia para renderizar después
        } else {
            // Si es una ruta local, agregar prefijo del servidor
            coverImage = series.cover_image.startsWith('http') ? series.cover_image : `/${series.cover_image}`;
        }
    } else {
        // Placeholder con color único basado en el título
        const bgColor = generateColorFromString(series.title);
        coverImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(series.title)}&size=400&background=${bgColor}&color=fff&bold=true`;
    }

    if (isMultiVolume) {
        // Tarjeta con efecto stack para series
        return `
            <div class="flex flex-col gap-2 cursor-pointer" onclick="openSeries(${series.id})">
                <div class="relative w-full aspect-[3/4]">
                    <div class="absolute h-full w-full bg-cover bg-center rounded-lg -rotate-6 transform scale-90" 
                         data-series-id="${series.id}"
                         style="background-image: url('${needsPDFRender ? 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E' : coverImage}'); z-index: 1; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>
                    <div class="absolute h-full w-full bg-cover bg-center rounded-lg rotate-3 transform scale-95" 
                         data-series-id="${series.id}"
                         style="background-image: url('${needsPDFRender ? 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E' : coverImage}'); z-index: 2; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>
                    <div class="bg-cover bg-center flex flex-col gap-3 rounded-lg justify-end p-3 aspect-[3/4] relative shadow-xl" 
                         data-alt="${series.title}" 
                         data-series-id="${series.id}"
                         style="background-image: linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 60%), url('${needsPDFRender ? 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E' : coverImage}'); z-index: 3;">
                        <div class="absolute top-2 right-2 flex h-6 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/90 backdrop-blur-sm px-2.5">
                            <p class="text-white text-xs font-bold leading-normal">${series.volume_count} vol${series.volume_count > 1 ? 's' : ''}</p>
                        </div>
                        ${hasProgress ? `
                        <div class="absolute bottom-2 right-2 rounded-lg bg-black/80 text-white text-sm font-bold px-2.5 py-1 shadow-lg">
                            ${progressPercent}%
                        </div>
                        <div class="absolute bottom-0 left-0 w-full h-1.5 bg-gray-200/30">
                            <div class="h-full bg-primary transition-all" style="width: ${progressPages}%;"></div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="flex flex-col">
                    <p class="text-gray-800 dark:text-white text-sm sm:text-base font-bold leading-tight truncate">${series.title}</p>
                    ${series.genre ? `<p class="text-xs text-gray-500 dark:text-gray-400 capitalize">${series.genre}</p>` : ''}
                </div>
            </div>
        `;
    } else {
        // Tarjeta simple para volúmenes únicos
        return `
            <div class="flex flex-col gap-2 cursor-pointer" onclick="openSeries(${series.id})">
                <div class="bg-cover bg-center flex flex-col gap-3 rounded-lg justify-end aspect-[3/4] relative overflow-hidden shadow-lg" 
                     data-alt="${series.title}" 
                     data-series-id="${series.id}"
                     style="background-image: url('${needsPDFRender ? 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E' : coverImage}');">
                    ${hasProgress ? `
                    <div class="absolute bottom-2 right-2 rounded-lg bg-black/80 text-white text-sm font-bold px-2.5 py-1 shadow-lg">
                        ${progressPercent}%
                    </div>
                    <div class="absolute bottom-0 left-0 w-full h-2 bg-gray-200/50 dark:bg-gray-700/50">
                        <div class="h-full bg-primary transition-all" style="width: ${progressPages}%;"></div>
                    </div>
                    ` : ''}
                </div>
                <div class="flex flex-col">
                    <p class="text-gray-800 dark:text-white text-sm sm:text-base font-bold leading-tight truncate">${series.title}</p>
                    ${series.genre ? `<p class="text-xs text-gray-500 dark:text-gray-400 capitalize">${series.genre}</p>` : ''}
                </div>
            </div>
        `;
    }
}

// Abrir serie (mostrar volúmenes)
async function openSeries(seriesId) {
    try {
        const [seriesResp, volsResp] = await Promise.all([
            fetch(`/api/series/${seriesId}`),
            fetch(`/api/series/${seriesId}/volumes`)
        ]);
        const series = seriesResp.ok ? await seriesResp.json() : null;
        const volumes = await volsResp.json();

        // SIEMPRE mostrar modal con información, incluso si es 1 solo volumen
        showVolumesModal(volumes, series);
    } catch (error) {
        console.error('Error al cargar volúmenes:', error);
        showError('Error al cargar los volúmenes');
    }
}

// Mostrar modal con volúmenes e información
function showVolumesModal(volumes, series) {
    // Obtener info de la serie desde el primer volumen
    const fallbackSeries = allSeries.find(s => s.id === volumes[0]?.series_id);
    const seriesTitle = (series?.title || fallbackSeries?.title) || volumes[0]?.title?.split(' - ')[0] || 'Serie';
    const author = series?.author;
    const description = series?.description;
    const genre = series?.genre;
    const readingMode = series?.reading_mode || 'paged';
    // Contar capítulos
    const chaptersCount = volumes.reduce((sum, v) => {
        if (v.chapter_start && v.chapter_end) return sum + (v.chapter_end - v.chapter_start + 1);
        if (v.chapter_number) return sum + 1;
        return sum;
    }, 0);
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4';
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    modal.innerHTML = `
        <div class="bg-background-light dark:bg-background-dark rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <!-- Header con info de serie -->
            <div class="flex gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-primary/10 to-transparent">
                <div class="flex-shrink-0">
                    ${series?.cover_image ? `
                    <img src="${series.cover_image.startsWith('http') ? series.cover_image : '/' + series.cover_image}" alt="${seriesTitle}" class="w-20 h-28 object-cover rounded-lg shadow-md" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(seriesTitle)}&size=200&background=7f19e6&color=fff';" />
                    ` : `
                    <div class="w-20 h-28 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary text-3xl">auto_stories</span>
                    </div>
                    `}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 class="text-xl font-bold text-gray-800 dark:text-white truncate">${seriesTitle}</h3>
                                <button id="reading-status-badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95" title="Click para cambiar estado">
                                    <!-- Estado se actualiza dinámicamente -->
                                </button>
                            </div>
                            ${author ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-1">por ${author}</p>` : ''}
                            ${description ? `<p class="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">${description}</p>` : ''}
                        </div>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-2">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="flex gap-2 mt-2 flex-wrap">
                        ${genre ? `<span class="text-xs px-3 py-1.5 bg-primary/20 text-primary dark:text-primary-light rounded-full font-medium">${genre}</span>` : ''}
                        ${chaptersCount > 0 ? `<span class="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">📖 ${chaptersCount} capítulo${chaptersCount !== 1 ? 's' : ''}</span>` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Acciones de serie -->
            <div class="flex flex-col gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <!-- Estado de publicación -->
                <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span class="material-symbols-outlined text-base">bookmark</span>
                    <span class="hidden sm:inline font-medium">Estado:</span>
                    <div class="inline-flex rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                        <button id="pub-status-ongoing" class="px-4 py-2 text-sm font-medium transition-all ${series?.publication_status==='ongoing'?'bg-blue-500 text-white shadow-sm':'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700'}">Publicándose</button>
                        <button id="pub-status-completed" class="px-4 py-2 text-sm font-medium transition-all border-l-2 border-gray-300 dark:border-gray-600 ${series?.publication_status==='completed'?'bg-green-500 text-white shadow-sm':'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-700'}">Completo</button>
                    </div>
                </div>
                <!-- Modo de lectura y acciones -->
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span class="material-symbols-outlined text-base">tune</span>
                        <span class="hidden sm:inline">Modo:</span>
                        <div class="inline-flex rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                            <button id="mode-default-paged" class="px-3 py-1 text-sm ${readingMode==='paged'?'bg-primary text-white':'bg-transparent text-inherit'}">Páginas</button>
                            <button id="mode-default-scroll" class="px-3 py-1 text-sm ${readingMode==='scroll'?'bg-primary text-white':'bg-transparent text-inherit'}">Scroll</button>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button id="edit-cover-btn" class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <span class="material-symbols-outlined text-sm">image</span>
                            <span class="hidden sm:inline">Portada</span>
                        </button>
                        <button id="edit-series-btn" class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors">
                            <span class="material-symbols-outlined text-sm">edit</span>
                            <span class="hidden sm:inline">Editar</span>
                        </button>
                        <button id="delete-series-btn" class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors">
                            <span class="material-symbols-outlined text-sm">delete</span>
                            <span class="hidden sm:inline">Borrar</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Lista de volúmenes -->
            <div class="overflow-y-auto flex-1 p-4">
                <div class="space-y-2">
                    ${volumes.map(v => createVolumeListItem(v)).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Eventos: cambiar estado de lectura del usuario (badge en el título)
    const readingBadge = modal.querySelector('#reading-status-badge');
    const updateReadingBadge = (status) => {
        const statusConfig = {
            'pending': {
                class: 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 border border-gray-300 dark:border-gray-600',
                text: 'En Espera'
            },
            'reading': {
                class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300 dark:border-blue-700',
                text: 'En Curso'
            },
            'completed': {
                class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700',
                text: 'Terminado'
            }
        };
        
        const config = statusConfig[status] || statusConfig['pending'];
        readingBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95 ${config.class}`;
        readingBadge.innerHTML = config.text;
        readingBadge.setAttribute('data-status', status);
    };
    
    // Inicializar badge con estado actual (por defecto: pending)
    const currentReadingStatus = series?.reading_status || 'pending';
    updateReadingBadge(currentReadingStatus);
    
    // Click en badge: ciclar entre estados (pending → reading → completed → pending)
    readingBadge?.addEventListener('click', async () => {
        const currentStatus = readingBadge.getAttribute('data-status');
        const statusCycle = {
            'pending': 'reading',
            'reading': 'completed',
            'completed': 'pending'
        };
        const newStatus = statusCycle[currentStatus] || 'reading';
        
        try {
            await fetch(`/api/series/${volumes[0].series_id}/settings`, { 
                method:'PUT', 
                headers:{'Content-Type':'application/json'}, 
                body: JSON.stringify({ reading_status: newStatus }) 
            });
            updateReadingBadge(newStatus);
            
            // Actualizar en cache
            const idx = allSeries.findIndex(s=>s.id===volumes[0].series_id);
            if (idx>=0) allSeries[idx].reading_status = newStatus;
        } catch (e) { 
            showError('No se pudo guardar el estado'); 
        }
    });

    // Eventos: cambiar estado de publicación
    const btnOngoing = modal.querySelector('#pub-status-ongoing');
    const btnCompleted = modal.querySelector('#pub-status-completed');
    const updatePubButtons = (status) => {
        // Ongoing button
        if (status === 'ongoing') {
            btnOngoing.className = 'px-4 py-2 text-sm font-medium transition-all bg-blue-500 text-white shadow-sm';
        } else {
            btnOngoing.className = 'px-4 py-2 text-sm font-medium transition-all bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700';
        }
        
        // Completed button
        if (status === 'completed') {
            btnCompleted.className = 'px-4 py-2 text-sm font-medium transition-all border-l-2 border-gray-300 dark:border-gray-600 bg-green-500 text-white shadow-sm';
        } else {
            btnCompleted.className = 'px-4 py-2 text-sm font-medium transition-all border-l-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-700';
        }
    };
    btnOngoing?.addEventListener('click', async () => {
        try {
            await fetch(`/api/series/${volumes[0].series_id}/settings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ publication_status:'ongoing' }) });
            updatePubButtons('ongoing');
            const idx = allSeries.findIndex(s=>s.id===volumes[0].series_id);
            if (idx>=0) allSeries[idx].publication_status = 'ongoing';
        } catch (e) { showError('No se pudo guardar'); }
    });
    btnCompleted?.addEventListener('click', async () => {
        try {
            await fetch(`/api/series/${volumes[0].series_id}/settings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ publication_status:'completed' }) });
            updatePubButtons('completed');
            const idx = allSeries.findIndex(s=>s.id===volumes[0].series_id);
            if (idx>=0) allSeries[idx].publication_status = 'completed';
        } catch (e) { showError('No se pudo guardar'); }
    });

    // Eventos: cambiar modo por defecto
    const btnPaged = modal.querySelector('#mode-default-paged');
    const btnScroll = modal.querySelector('#mode-default-scroll');
    const updateButtons = (mode) => {
        btnPaged.classList.toggle('bg-primary', mode==='paged');
        btnPaged.classList.toggle('text-white', mode==='paged');
        btnScroll.classList.toggle('bg-primary', mode==='scroll');
        btnScroll.classList.toggle('text-white', mode==='scroll');
    };
    btnPaged?.addEventListener('click', async () => {
        try {
            await fetch(`/api/series/${volumes[0].series_id}/settings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reading_mode:'paged' }) });
            updateButtons('paged');
            // actualizar en cache si existe
            const idx = allSeries.findIndex(s=>s.id===volumes[0].series_id);
            if (idx>=0) allSeries[idx].reading_mode = 'paged';
        } catch (e) { showError('No se pudo guardar el modo'); }
    });
    btnScroll?.addEventListener('click', async () => {
        try {
            await fetch(`/api/series/${volumes[0].series_id}/settings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reading_mode:'scroll' }) });
            updateButtons('scroll');
            const idx = allSeries.findIndex(s=>s.id===volumes[0].series_id);
            if (idx>=0) allSeries[idx].reading_mode = 'scroll';
        } catch (e) { showError('No se pudo guardar el modo'); }
    });

    // Eventos: editar portada
    const editCoverBtn = modal.querySelector('#edit-cover-btn');
    editCoverBtn?.addEventListener('click', () => {
        openCoverEditor(volumes[0].series_id, series?.cover_image, seriesTitle);
    });

    // Eventos: editar información de la serie
    const editSeriesBtn = modal.querySelector('#edit-series-btn');
    editSeriesBtn?.addEventListener('click', () => {
        openEditSeriesModal(series || { id: volumes[0].series_id, title: seriesTitle }, modal);
    });

    // Eventos: borrar serie
    const deleteSeriesBtn = modal.querySelector('#delete-series-btn');
    deleteSeriesBtn?.addEventListener('click', () => {
        openDeleteConfirmModal(series || { id: volumes[0].series_id, title: seriesTitle }, modal);
    });
}

// Mostrar opciones de portadas encontradas por IA
function showCoverOptions(covers, seriesId, loadImageCallback) {
    const optionsModal = document.createElement('div');
    optionsModal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4';
    optionsModal.onclick = (e) => {
        if (e.target === optionsModal) optionsModal.remove();
    };

    optionsModal.innerHTML = `
        <div class="bg-background-light dark:bg-background-dark rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white">Selecciona una Página como Portada</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <div class="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${covers.map((cover, index) => `
                        <div class="cover-option cursor-pointer group relative" data-url="${cover.url}">
                            <div class="aspect-[3/4] rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-primary transition-all group-hover:shadow-xl bg-gray-100 dark:bg-gray-800">
                                <img src="${cover.url}" alt="${cover.label || 'Página ' + (index + 1)}" class="w-full h-full object-cover" loading="lazy" 
                                     onerror="this.src='https://via.placeholder.com/400x533/6366f1/ffffff?text=Página+${index + 1}'" />
                            </div>
                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center pointer-events-none">
                                <span class="material-symbols-outlined text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">check_circle</span>
                            </div>
                            <div class="mt-2 text-center">
                                <p class="text-xs font-medium text-gray-700 dark:text-gray-300">${cover.label || 'Página ' + (index + 1)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(optionsModal);

    // Event listeners para cada opción
    optionsModal.querySelectorAll('.cover-option').forEach(option => {
        option.addEventListener('click', async () => {
            const imageUrl = option.dataset.url;
            
            // Descargar imagen y convertir a blob
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
                
                // Cerrar modal de opciones
                optionsModal.remove();
                
                // Cargar imagen en el editor
                loadImageCallback(file);
            } catch (error) {
                showError('Error al cargar la imagen seleccionada');
                console.error(error);
            }
        });
    });
}

// Editor de portada con preview, drag & drop y recorte
function openCoverEditor(seriesId, currentCover, seriesTitle) {
    const editorModal = document.createElement('div');
    editorModal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
    editorModal.onclick = (e) => {
        if (e.target === editorModal) editorModal.remove();
    };

    editorModal.innerHTML = `
        <div class="bg-background-light dark:bg-background-dark rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white">Editor de Portada</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <div class="p-4 space-y-4">
                <!-- Preview con Canvas -->
                <div class="flex justify-center">
                    <div id="cover-preview-container" class="relative w-48 h-64 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-600">
                        ${currentCover ? `<img src="${currentCover}" class="w-full h-full object-cover" id="preview-img" />` : `
                        <div class="text-center text-gray-400 pointer-events-none">
                            <span class="material-symbols-outlined text-5xl">image</span>
                            <p class="text-xs mt-2">Arrastra imagen aquí<br/>o haz click abajo</p>
                        </div>
                        `}
                    </div>
                </div>
                
                <!-- Controles -->
                <div class="space-y-3">
                    <div class="grid grid-cols-2 gap-2">
                        <label class="block">
                            <div class="w-full text-center px-4 py-2 rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer">
                                <span class="material-symbols-outlined align-middle text-sm">upload</span>
                                <span class="align-middle ml-1 text-sm">Seleccionar</span>
                            </div>
                            <input id="cover-file-input" type="file" accept="image/*" class="hidden" />
                        </label>
                        <button id="extract-pages-btn" class="w-full text-center px-4 py-2 rounded-lg border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors">
                            <span class="material-symbols-outlined align-middle text-sm">image</span>
                            <span class="align-middle ml-1 text-sm">Usar Páginas</span>
                        </button>
                    </div>
                    
                    <div id="adjust-controls" class="space-y-2 hidden">
                        <p class="text-xs text-gray-600 dark:text-gray-400 text-center">
                            💡 Arrastra la imagen para reposicionarla
                        </p>
                        
                        <label class="block">
                            <span class="text-sm text-gray-700 dark:text-gray-300">Zoom</span>
                            <input id="zoom-slider" type="range" min="100" max="300" value="100" class="w-full mt-1" />
                            <div class="flex justify-between text-xs text-gray-500">
                                <span>100%</span>
                                <span id="zoom-value">100%</span>
                                <span>300%</span>
                            </div>
                        </label>
                    </div>
                </div>
                
                <!-- Botones -->
                <div class="flex gap-2 pt-2">
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        Cancelar
                    </button>
                    <button id="save-cover-btn" class="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(editorModal);

    const fileInput = editorModal.querySelector('#cover-file-input');
    const previewContainer = editorModal.querySelector('#cover-preview-container');
    const adjustControls = editorModal.querySelector('#adjust-controls');
    const zoomSlider = editorModal.querySelector('#zoom-slider');
    const zoomValue = editorModal.querySelector('#zoom-value');
    const saveBtn = editorModal.querySelector('#save-cover-btn');
    
    let selectedFile = null;
    let previewImg = editorModal.querySelector('#preview-img');
    let scale = 1;
    let posX = 0;
    let posY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    // Función para cargar imagen
    function loadImage(file) {
        selectedFile = file;
        const reader = new FileReader();
        
        reader.onload = (ev) => {
            // Crear o actualizar imagen preview
            previewContainer.innerHTML = `
                <img src="${ev.target.result}" 
                     id="preview-img" 
                     class="absolute cursor-move"
                     style="transform: translate(0px, 0px) scale(1); transform-origin: center;" 
                     draggable="false" />
            `;
            previewImg = previewContainer.querySelector('#preview-img');
            
            // Ajustar imagen al contenedor manteniendo aspecto
            previewImg.onload = () => {
                const containerW = previewContainer.offsetWidth;
                const containerH = previewContainer.offsetHeight;
                const imgW = previewImg.naturalWidth;
                const imgH = previewImg.naturalHeight;
                
                // Calcular escala para cubrir el contenedor
                const scaleW = containerW / imgW;
                const scaleH = containerH / imgH;
                scale = Math.max(scaleW, scaleH);
                
                previewImg.style.width = imgW + 'px';
                previewImg.style.height = imgH + 'px';
                previewImg.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
                
                zoomSlider.value = Math.round(scale * 100);
                zoomValue.textContent = Math.round(scale * 100) + '%';
                
                setupDragHandlers();
            };
            
            // Mostrar controles
            adjustControls.classList.remove('hidden');
            saveBtn.disabled = false;
        };
        
        reader.readAsDataURL(file);
    }

    // Configurar drag & drop en la imagen
    function setupDragHandlers() {
        previewImg.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX - posX;
            startY = e.clientY - posY;
            previewImg.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            posX = e.clientX - startX;
            posY = e.clientY - startY;
            previewImg.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                previewImg.style.cursor = 'move';
            }
        });

        // Touch support
        previewImg.addEventListener('touchstart', (e) => {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX - posX;
            startY = touch.clientY - posY;
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            posX = touch.clientX - startX;
            posY = touch.clientY - startY;
            previewImg.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
        });

        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    // Selector de archivo
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) loadImage(file);
    });

    // Botón de extraer páginas de PDFs
    const extractPagesBtn = editorModal.querySelector('#extract-pages-btn');
    extractPagesBtn?.addEventListener('click', async () => {
        extractPagesBtn.disabled = true;
        extractPagesBtn.innerHTML = '<span class="material-symbols-outlined align-middle text-sm animate-spin">progress_activity</span><span class="align-middle ml-1 text-sm">Extrayendo...</span>';
        
        try {
            const response = await fetch(`/api/extract-cover-pages/${seriesId}`);
            const data = await response.json();
            
            if (data.success && data.volumes && data.volumes.length > 0) {
                // Extraer páginas del lado del cliente usando PDF.js
                const pages = await extractPagesFromVolumes(data.volumes);
                
                if (pages.length > 0) {
                    showCoverOptions(pages, seriesId, loadImage);
                } else {
                    showError('No se pudieron extraer páginas de los PDFs');
                }
            } else {
                showError('No se encontraron volúmenes con PDFs');
            }
        } catch (error) {
            showError('Error al extraer páginas');
            console.error(error);
        } finally {
            extractPagesBtn.disabled = false;
            extractPagesBtn.innerHTML = '<span class="material-symbols-outlined align-middle text-sm">image</span><span class="align-middle ml-1 text-sm">Usar Páginas</span>';
        }
    });

    // Drag & drop en contenedor
    previewContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        previewContainer.classList.add('border-primary', 'bg-primary/10');
    });

    previewContainer.addEventListener('dragleave', () => {
        previewContainer.classList.remove('border-primary', 'bg-primary/10');
    });

    previewContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        previewContainer.classList.remove('border-primary', 'bg-primary/10');
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            loadImage(file);
        }
    });

    // Zoom slider
    zoomSlider?.addEventListener('input', (e) => {
        scale = parseInt(e.target.value) / 100;
        zoomValue.textContent = e.target.value + '%';
        if (previewImg) {
            previewImg.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
        }
    });

    // Guardar portada
    saveBtn?.addEventListener('click', async () => {
        if (!selectedFile) return;
        
        saveBtn.disabled = true;
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Guardando...';
        
        // Crear canvas para recortar
        const canvas = document.createElement('canvas');
        canvas.width = 400; // Ancho estándar de portada
        canvas.height = 533; // Alto proporcional (3:4)
        const ctx = canvas.getContext('2d');
        
        // Dibujar imagen en canvas con transformaciones aplicadas
        const img = new Image();
        img.src = previewImg.src;
        
        img.onload = async () => {
            const containerW = previewContainer.offsetWidth;
            const containerH = previewContainer.offsetHeight;
            
            // Calcular posición y escala para el canvas
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const scaledW = img.width * scale;
            const scaledH = img.height * scale;
            const scaleRatio = canvas.width / containerW;
            
            const finalScale = scale * scaleRatio;
            const finalX = posX * scaleRatio;
            const finalY = posY * scaleRatio;
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.translate(finalX, finalY);
            ctx.scale(finalScale, finalScale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            
            // Convertir canvas a blob
            canvas.toBlob(async (blob) => {
                const fd = new FormData();
                fd.append('image', blob, 'cover.jpg');
                
                try {
                    const resp = await fetch(`/api/series/${seriesId}/cover`, { 
                        method: 'POST', 
                        body: fd 
                    });
                    const data = await resp.json();
                    
                    if (data.success) {
                        // Cerrar editor primero
                        editorModal.remove();
                        
                        // Cerrar modal de detalles si está abierto
                        const detailsModal = document.querySelector('.fixed.inset-0.z-50');
                        if (detailsModal) detailsModal.remove();
                        
                        // Mostrar mensaje de éxito
                        showError('Portada actualizada correctamente');
                        
                        // Recargar biblioteca para ver la nueva portada
                        await loadLibrary();
                    } else {
                        showError('No se pudo actualizar la portada: ' + (data.error || 'Error desconocido'));
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = originalText;
                    }
                } catch (err) {
                    console.error('Error al subir:', err);
                    showError('❌ Error al subir portada');
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                }
            }, 'image/jpeg', 0.9);
        };
    });
}

// Crear item de volumen en la lista
function createVolumeListItem(volume) {
    const progress = volume.total_pages > 0 ? (volume.current_page / volume.total_pages) * 100 : 0;
    const statusIcon = volume.status === 'completed' ? 'check_circle' : volume.status === 'reading' ? 'schedule' : 'radio_button_unchecked';
    const statusColor = volume.status === 'completed' ? 'text-green-500' : volume.status === 'reading' ? 'text-primary' : 'text-gray-400';
    
    // Formatear info del volumen
    let volumeInfo = '';
    if (volume.chapter_start && volume.chapter_end) {
        volumeInfo = `Cap. ${volume.chapter_start}-${volume.chapter_end}`;
    } else if (volume.volume_number) {
        volumeInfo = `Vol. ${volume.volume_number}`;
    } else if (volume.chapter_number) {
        volumeInfo = `Cap. ${volume.chapter_number}`;
    }

    return `
        <div class="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-[#362447] hover:bg-gray-200 dark:hover:bg-[#4a2f5a] transition-colors group">
            <div onclick="window.location.href='/reader/${volume.id}'" class="flex items-center gap-3 flex-1 cursor-pointer">
                <div class="flex-shrink-0 w-12 h-16 rounded bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center relative overflow-hidden">
                    <span class="material-symbols-outlined text-primary text-2xl">picture_as_pdf</span>
                    <div class="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-sm ${statusColor}">${statusIcon}</span>
                        <p class="text-sm font-bold text-gray-800 dark:text-white truncate">${volume.title}</p>
                    </div>
                    ${volumeInfo ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">${volumeInfo}</p>` : ''}
                    ${progress > 0 ? `
                    <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div class="h-full bg-primary transition-all" style="width: ${progress}%;"></div>
                        </div>
                        <span class="text-xs text-gray-500 dark:text-gray-400">${Math.round(progress)}%</span>
                    </div>
                    ` : ''}
                </div>
                <span class="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">play_arrow</span>
            </div>
            <button onclick="event.stopPropagation(); deleteVolume(${volume.id}, '${volume.title.replace(/'/g, "\\'")}');" 
                    class="flex-shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="Borrar este volumen">
                <span class="material-symbols-outlined text-xl">delete</span>
            </button>
        </div>
    `;
}

// Generar color desde string (para covers por defecto)
function generateColorFromString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.abs(hash).toString(16).substring(0, 6);
    return color.padEnd(6, '0');
}

// Mostrar error
function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// Monitoreo del estado de procesamiento
let processingStatusInterval = null;

function startProcessingStatusPolling() {
    // Verificar cada 5 segundos
    processingStatusInterval = setInterval(checkProcessingStatus, 5000);
    // Verificar inmediatamente también
    checkProcessingStatus();
}

async function checkProcessingStatus() {
    try {
        const response = await fetch('/api/processing-status');
        const status = await response.json();
        
        updateProcessingIndicator(status);
    } catch (error) {
        console.error('Error al verificar estado de procesamiento:', error);
    }
}

function updateProcessingIndicator(status) {
    let indicator = document.getElementById('processingIndicator');
    
    if (status.queue_size > 0 || status.is_processing) {
        // Crear indicador si no existe
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'processingIndicator';
            indicator.className = 'fixed top-20 right-6 bg-primary text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
            indicator.innerHTML = `
                <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span id="processingText">Procesando...</span>
            `;
            document.body.appendChild(indicator);
        }
        
        // Actualizar texto
        const text = document.getElementById('processingText');
        if (text) {
            text.textContent = `Procesando ${status.queue_size} archivo${status.queue_size !== 1 ? 's' : ''}...`;
        }
        
        // Recargar biblioteca cuando termine el procesamiento
        if (status.queue_size === 0 && !status.is_processing) {
            setTimeout(() => {
                loadLibrary();
                loadStats();
            }, 1000);
        }
    } else {
        // Remover indicador si ya no hay procesamiento
        if (indicator) {
            indicator.remove();
        }
    }
}

// Actualizar estilos de filtros activos
// Abrir modal para editar información de la serie
function openEditSeriesModal(series, parentModal) {
    const editModal = document.createElement('div');
    editModal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
    
    editModal.innerHTML = `
        <div class="bg-background-light dark:bg-background-dark rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white">Editar Manga</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <form id="edit-series-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                    <input type="text" id="edit-title" value="${series.title || ''}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autor</label>
                    <input type="text" id="edit-author" value="${series.author || ''}" placeholder="Opcional" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                    <textarea id="edit-description" rows="3" placeholder="Opcional" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent">${series.description || ''}</textarea>
                </div>
                
                <div class="flex gap-2 justify-end pt-2">
                    <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors">
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(editModal);
    
    // Manejar submit del formulario
    const form = editModal.querySelector('#edit-series-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newTitle = document.getElementById('edit-title').value.trim();
        const newAuthor = document.getElementById('edit-author').value.trim();
        const newDescription = document.getElementById('edit-description').value.trim();
        
        if (!newTitle) {
            showError('El título no puede estar vacío');
            return;
        }
        
        try {
            const response = await fetch(`/api/series/${series.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    author: newAuthor || null,
                    description: newDescription || null
                })
            });
            
            if (!response.ok) throw new Error('Error al actualizar');
            
            // Actualizar cache local
            const idx = allSeries.findIndex(s => s.id === series.id);
            if (idx >= 0) {
                allSeries[idx].title = newTitle;
                allSeries[idx].author = newAuthor;
                allSeries[idx].description = newDescription;
            }
            
            // Recargar biblioteca para mostrar cambios
            await loadLibrary();
            
            // Cerrar modales
            editModal.remove();
            if (parentModal) parentModal.remove();
            
            showSuccess('Manga actualizado correctamente');
        } catch (error) {
            console.error('Error:', error);
            showError('No se pudo actualizar el manga');
        }
    });
}

// Abrir modal de confirmación para borrar serie
function openDeleteConfirmModal(series, parentModal) {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
    
    confirmModal.innerHTML = `
        <div class="bg-background-light dark:bg-background-dark rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div class="flex items-center justify-center mb-4">
                <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">warning</span>
                </div>
            </div>
            
            <h3 class="text-lg font-bold text-gray-800 dark:text-white text-center mb-2">¿Borrar este manga?</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 text-center mb-1">"${series.title}"</p>
            <p class="text-xs text-red-600 dark:text-red-400 text-center mb-6">Esta acción no se puede deshacer. Se borrarán todos los capítulos y archivos.</p>
            
            <div class="flex gap-2 justify-end">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    Cancelar
                </button>
                <button id="confirm-delete-btn" class="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                    Sí, Borrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Manejar confirmación
    const confirmBtn = confirmModal.querySelector('#confirm-delete-btn');
    confirmBtn.addEventListener('click', async () => {
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="animate-spin material-symbols-outlined">progress_activity</span> Borrando...';
            
            const response = await fetch(`/api/series/${series.id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Error al borrar');
            
            // Eliminar del cache local
            const idx = allSeries.findIndex(s => s.id === series.id);
            if (idx >= 0) {
                allSeries.splice(idx, 1);
            }
            
            // Recargar biblioteca
            await loadLibrary();
            
            // Cerrar modales
            confirmModal.remove();
            if (parentModal) parentModal.remove();
            
            showSuccess('Manga borrado correctamente');
        } catch (error) {
            console.error('Error:', error);
            showError('No se pudo borrar el manga');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Sí, Borrar';
        }
    });
}

// Borrar volumen individual (con confirmación)
async function deleteVolume(volumeId, volumeTitle) {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
    
    confirmModal.innerHTML = `
        <div class="bg-background-light dark:bg-background-dark rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div class="flex items-center justify-center mb-4">
                <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">warning</span>
                </div>
            </div>
            
            <h3 class="text-lg font-bold text-gray-800 dark:text-white text-center mb-2">¿Borrar este capítulo?</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 text-center mb-1">"${volumeTitle}"</p>
            <p class="text-xs text-red-600 dark:text-red-400 text-center mb-6">El archivo PDF será eliminado. Si es el único capítulo, la serie completa será borrada.</p>
            
            <div class="flex gap-2 justify-end">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    Cancelar
                </button>
                <button id="confirm-delete-volume-btn" class="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">
                    Sí, Borrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Manejar confirmación
    const confirmBtn = confirmModal.querySelector('#confirm-delete-volume-btn');
    confirmBtn.addEventListener('click', async () => {
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="animate-spin material-symbols-outlined">progress_activity</span> Borrando...';
            
            const response = await fetch(`/api/volumes/${volumeId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Error al borrar');
            
            const result = await response.json();
            
            // Recargar biblioteca
            await loadLibrary();
            
            // Cerrar modal de confirmación
            confirmModal.remove();
            
            // Cerrar modal de volúmenes si la serie fue borrada
            if (result.seriesDeleted) {
                const volumesModal = document.querySelector('.fixed.z-50');
                if (volumesModal) volumesModal.remove();
                showSuccess('Capítulo borrado. La serie fue eliminada (no quedaban más capítulos)');
            } else {
                // Recargar el modal de volúmenes
                const volumesModal = document.querySelector('.fixed.z-50');
                if (volumesModal) volumesModal.remove();
                showSuccess('Capítulo borrado correctamente');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('No se pudo borrar el capítulo');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Sí, Borrar';
        }
    });
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 z-[100] bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-up';
    toast.innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

const style = document.createElement('style');
style.textContent = `
    .filter-chip {
        background-color: rgb(243 244 246);
        color: rgb(75 85 99);
    }
    .dark .filter-chip {
        background-color: rgba(127, 25, 230, 0.2);
        color: rgb(209 213 219);
    }
    .filter-chip.active {
        background-color: rgba(127, 25, 230, 0.2);
        color: #7f19e6;
    }
    .dark .filter-chip.active {
        background-color: rgba(127, 25, 230, 0.3);
        color: white;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .animate-spin {
        animation: spin 1s linear infinite;
    }
    @keyframes slide-up {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    .animate-slide-up {
        animation: slide-up 0.3s ease-out;
    }
`;
document.head.appendChild(style);
