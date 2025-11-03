// reader.js - Lector de PDF con PDF.js

// Configurar PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
let volumeId = null;
let canvas = null;
let ctx = null;
let uiVisible = true;
let autoHideTimer = null;
let readingMode = 'scroll'; // 'paged' | 'scroll' - Por defecto scroll
let pagesContainer = null;
let scrollObserver = null;
let isProgrammaticScroll = false; // Flag para evitar loops de scroll
let isUpdatingSlider = false; // Flag para evitar que el slider dispare navegación cuando se actualiza programáticamente

// Función global para sincronizar UI de modo de lectura
window.syncMenuChecks = function() {
    const checkPaged = document.getElementById('check-paged');
    const checkScroll = document.getElementById('check-scroll');
    const btnPaged = document.getElementById('mode-paged');
    const btnScroll = document.getElementById('mode-scroll');
    
    if (checkPaged && checkScroll && btnPaged && btnScroll) {
        if (readingMode === 'scroll') {
            // Scroll está activo
            checkScroll.classList.remove('hidden');
            checkPaged.classList.add('hidden');
            btnScroll.classList.add('bg-primary/10', 'dark:bg-primary/20');
            btnPaged.classList.remove('bg-primary/10', 'dark:bg-primary/20');
        } else {
            // Paged está activo
            checkPaged.classList.remove('hidden');
            checkScroll.classList.add('hidden');
            btnPaged.classList.add('bg-primary/10', 'dark:bg-primary/20');
            btnScroll.classList.remove('bg-primary/10', 'dark:bg-primary/20');
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Obtener ID del volumen desde la URL
    const pathParts = window.location.pathname.split('/');
    volumeId = pathParts[pathParts.length - 1];

    if (!volumeId || volumeId === 'reader') {
        showError('ID de volumen no válido');
        return;
    }

    canvas = document.getElementById('pdf-canvas');
    ctx = canvas.getContext('2d');
    pagesContainer = document.getElementById('pdf-pages');

    // NO establecer modo por defecto aquí - se cargará desde la BD
    loadVolumeAndPDF();
    setupEventListeners();
    setupAutoHideUI();
    
    // Guardar progreso antes de cerrar la pestaña/app
    window.addEventListener('beforeunload', (e) => {
        // Guardar inmediatamente sin debounce
        if (volumeId && pageNum && pdfDoc) {
            // Cancelar el debounce pendiente y guardar inmediatamente
            clearTimeout(saveProgressTimeout);
            
            // Fetch síncrono (keepalive para que persista después de cerrar)
            fetch(`/api/volumes/${volumeId}/progress`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    current_page: pageNum,
                    total_pages: pdfDoc.numPages
                }),
                keepalive: true // Importante: mantiene la petición incluso si la página se cierra
            }).catch(() => {}); // Ignorar errores en el cierre
        }
    });
    
    // También guardar cuando se oculta la página (para apps móviles)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && volumeId && pageNum && pdfDoc) {
            clearTimeout(saveProgressTimeout);
            fetch(`/api/volumes/${volumeId}/progress`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    current_page: pageNum,
                    total_pages: pdfDoc.numPages
                }),
                keepalive: true
            }).catch(() => {});
        }
    });
});

// Cargar información del volumen y el PDF
async function loadVolumeAndPDF() {
    try {
        const response = await fetch(`/api/volumes/${volumeId}`);
        if (!response.ok) throw new Error('Volumen no encontrado');
        
        const volume = await response.json();
        
        // Actualizar título
        document.getElementById('book-title').textContent = volume.title;
        
        // Cargar modo de lectura desde la base de datos (por serie)
        try {
            const seriesResp = await fetch(`/api/series/${volume.series_id}`);
            if (seriesResp.ok) {
                const series = await seriesResp.json();
                // Prioridad: BD > por defecto 'scroll'
                readingMode = series.reading_mode || 'scroll';
            } else {
                readingMode = 'scroll'; // Default si falla
            }
        } catch (_) {
            readingMode = 'scroll'; // Default si falla
        }
        
        // Sincronizar UI inmediatamente después de cargar el modo
        if (window.syncMenuChecks) {
            window.syncMenuChecks();
        }
        
        // Cargar PDF (codificar solo caracteres problemáticos como [])
        let pdfUrl = volume.file_path.startsWith('/') ? volume.file_path : '/' + volume.file_path;
        // Solo codificar corchetes y otros caracteres especiales que causan problemas
        pdfUrl = pdfUrl.replace(/\[/g, '%5B').replace(/\]/g, '%5D').replace(/ /g, '%20');
        
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        
        pdfDoc = await loadingTask.promise;
        document.getElementById('page-slider').max = pdfDoc.numPages;
        
        // Guardar la última página leída para mostrar en el slider
        // pero el scroll SIEMPRE empieza en página 1 (scroll libre estilo Lezhin)
        const lastReadPage = volume.current_page && volume.current_page > 0 ? volume.current_page : 1;
        pageNum = lastReadPage; // Solo para actualizar el slider
        
        console.log(`📖 Manga cargado - Total: ${pdfDoc.numPages} páginas`);
        if (lastReadPage > 1) {
            console.log(`ℹ️ Última lectura: página ${lastReadPage} (usa el slider para continuar)`);
        }
        
        // Actualizar total de páginas si no existe
        if (volume.total_pages === 0) {
            await fetch(`/api/volumes/${volumeId}/progress`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    current_page: pageNum, 
                    total_pages: pdfDoc.numPages 
                })
            });
        }
        
        document.getElementById('loading-indicator').style.display = 'none';

        // Render según modo
        if (readingMode === 'scroll') {
            enterScrollMode();
        } else {
            enterPagedMode();
        }
        
        // Sincronizar checks visuales después de cargar
        if (window.syncMenuChecks) {
            window.syncMenuChecks();
        }
        
    } catch (error) {
        console.error('Error al cargar PDF:', error);
        showError('Error al cargar el manga: ' + error.message);
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Botón Atrás
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = '/';
    });

    // Áreas de navegación
    document.getElementById('prev-page-area').addEventListener('click', () => {
        if (pageNum > 1) {
            changePage(-1);
        }
    });

    document.getElementById('next-page-area').addEventListener('click', () => {
        if (pageNum < pdfDoc.numPages) {
            changePage(1);
        }
    });

    document.getElementById('toggle-ui-area').addEventListener('click', toggleUI);

    // Abrir/cerrar menú
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');
    
    // Sincronizar UI inicial (la función ya está definida globalmente)
    window.syncMenuChecks();

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('hidden');
        resetAutoHideUI();
    });
    document.addEventListener('click', () => {
        menuDropdown.classList.add('hidden');
    });
    menuDropdown.addEventListener('click', (e) => e.stopPropagation());

    document.getElementById('mode-paged').addEventListener('click', async () => {
        if (readingMode !== 'paged') {
            readingMode = 'paged';
            // Guardar en BD (por serie)
            await saveReadingModeToServer(readingMode);
            exitScrollMode();
            enterPagedMode();
            window.syncMenuChecks();
        }
        menuDropdown.classList.add('hidden');
    });
    document.getElementById('mode-scroll').addEventListener('click', async () => {
        if (readingMode !== 'scroll') {
            readingMode = 'scroll';
            // Guardar en BD (por serie)
            await saveReadingModeToServer(readingMode);
            exitPagedMode();
            enterScrollMode();
            window.syncMenuChecks();
        }
        menuDropdown.classList.add('hidden');
    });

    // Botones Prev/Next (DESHABILITADOS TEMPORALMENTE para debug)
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            console.log('🔘 Botón Anterior clickeado - DESHABILITADO para debug');
            // Temporalmente deshabilitado
        });
        nextBtn.addEventListener('click', () => {
            console.log('🔘 Botón Siguiente clickeado - DESHABILITADO para debug');
            // Temporalmente deshabilitado
        });
    }

    // Slider de páginas (con actualización visual en tiempo real - estilo Lezhin)
    const pageSlider = document.getElementById('page-slider');
    let sliderDragging = false;
    
    pageSlider.addEventListener('mousedown', () => {
        sliderDragging = true;
    });
    
    pageSlider.addEventListener('mouseup', () => {
        sliderDragging = false;
    });
    
    pageSlider.addEventListener('touchstart', () => {
        sliderDragging = true;
    });
    
    pageSlider.addEventListener('touchend', () => {
        sliderDragging = false;
    });
    
    pageSlider.addEventListener('input', (e) => {
        const newPage = parseInt(e.target.value);
        
        console.log(`🎚️ Slider input: newPage=${newPage}, pageNum=${pageNum}, isUpdatingSlider=${isUpdatingSlider}, sliderDragging=${sliderDragging}`);
        
        // CRÍTICO: Solo actuar si el usuario está arrastrando el slider
        // Si no está arrastrando, significa que el cambio es programático
        if (!sliderDragging) {
            console.log('  ⏭️ Ignorando - usuario NO está arrastrando el slider');
            return;
        }
        
        // Actualizar visuales del slider mientras se arrastra
        const totalPages = pdfDoc ? pdfDoc.numPages : 100;
        const progress = ((newPage - 1) / Math.max(1, totalPages - 1)) * 100;
        
        const track = document.getElementById('slider-track');
        const thumb = document.getElementById('slider-thumb');
        
        if (track) track.style.width = `${progress}%`;
        if (thumb) thumb.style.left = `${progress}%`;
        
        // Actualizar número de página
        document.getElementById('page-num').textContent = newPage;
        
        console.log(`  ℹ️ Usuario arrastrando slider a página ${newPage}`);
    });
    
    // Navegar cuando se suelta el slider (evento change)
    pageSlider.addEventListener('change', (e) => {
        const newPage = parseInt(e.target.value);
        
        console.log(`🎚️ Slider change (soltó): newPage=${newPage}, pageNum=${pageNum}, sliderDragging=${sliderDragging}`);
        console.log('  ⚠️ NAVEGACIÓN DEL SLIDER DESHABILITADA para debug');
        
        // TEMPORALMENTE DESHABILITADO - solo para ver si este es el problema
        /*
        if (newPage !== pageNum) {
            console.log(`  → Navegando a página ${newPage} (usuario soltó el slider)`);
            if (readingMode === 'scroll') {
                scrollToPage(newPage, false);
            } else {
                goToPage(newPage);
            }
        }
        */
        
        // Asegurar que sliderDragging esté en false
        sliderDragging = false;
    });

    // Controles de zoom (verificar que existan primero)
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            changeZoom(0.25);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            changeZoom(-0.25);
        });
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            scale = 1.5;
            updateZoomDisplay();
            if (readingMode === 'scroll') {
                rerenderAllPages();
            } else {
                renderPage(pageNum);
            }
        });
    }

    // Atajos de teclado (DESHABILITADOS TEMPORALMENTE para debug)
    document.addEventListener('keydown', (e) => {
        console.log(`⌨️ Tecla presionada: ${e.key} - NAVEGACIÓN DESHABILITADA para debug`);
        
        // SOLO mantener toggle UI
        if (e.key === 'f' || e.key === 'F') {
            toggleUI();
        }
        
        // Todo lo demás está deshabilitado temporalmente
        /*
        switch(e.key) {
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
            case 'Home':
            case 'End':
                // DESHABILITADO
                break;
        }
        */
    });

    // Gestos táctiles (pinch zoom)
    let initialDistance = 0;
    let initialScale = scale;

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            initialDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            initialScale = scale;
        }
    });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            const newScale = initialScale * (distance / initialDistance);
            scale = Math.max(0.5, Math.min(5, newScale));
            updateZoomDisplay();
            if (readingMode === 'scroll') {
                // En scroll, re-render más tarde para evitar bloquear
                debounceRerenderAllPages();
            } else {
                renderPage(pageNum);
            }
        }
    });

    // Pinch zoom también sobre el contenedor (para modo scroll)
    const container = document.getElementById('pdf-container');
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            initialDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            initialScale = scale;
        }
    }, { passive: false });
    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const distance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            const newScale = initialScale * (distance / initialDistance);
            scale = Math.max(0.5, Math.min(5, newScale));
            updateZoomDisplay();
            if (readingMode === 'scroll') {
                debounceRerenderAllPages();
            } else {
                renderPage(pageNum);
            }
        }
    }, { passive: false });
}

// Entrar a modo por páginas
function enterPagedMode() {
    // Mostrar canvas único
    canvas.style.display = '';
    // Ocultar páginas continuas
    pagesContainer.innerHTML = '';
    pagesContainer.style.display = 'none';
    // Mostrar áreas de navegación
    document.getElementById('prev-page-area').style.display = '';
    document.getElementById('next-page-area').style.display = '';
    document.getElementById('toggle-ui-area').style.display = '';
    // Render page actual
    renderPage(pageNum);
}

function exitPagedMode() {
    // Nada especial por ahora
}

// Entrar a modo scroll continuo
function enterScrollMode() {
    // Ocultar canvas único
    canvas.style.display = 'none';
    // Mostrar contenedor de páginas
    pagesContainer.style.display = '';
    pagesContainer.innerHTML = '';

    // Ocultar áreas de toque para navegación
    document.getElementById('prev-page-area').style.display = 'none';
    document.getElementById('next-page-area').style.display = 'none';
    document.getElementById('toggle-ui-area').style.display = 'none';

    // RENDERIZAR TODAS LAS PÁGINAS antes de mostrar el visor
    createPagePlaceholders().then(async () => {
        console.log(`📚 Renderizando todas las páginas del manga...`);
        
        const totalPages = pdfDoc.numPages;
        const loadingText = document.getElementById('loading-text');
        const loadingProgress = document.getElementById('loading-progress');
        const loadingBar = document.getElementById('loading-bar');
        
        // Renderizar TODAS las páginas con progreso
        for (let i = 1; i <= totalPages; i++) {
            const placeholder = pagesContainer.querySelector(`[data-page-number='${i}']`);
            if (placeholder) {
                // Actualizar progreso
                const progress = Math.round((i / totalPages) * 100);
                if (loadingProgress) loadingProgress.textContent = `Renderizando página ${i} de ${totalPages}`;
                if (loadingBar) loadingBar.style.width = `${progress}%`;
                
                console.log(`🎨 Renderizando página ${i}/${totalPages}`);
                await renderPageInPlaceholder(i, placeholder);
            }
        }
        
        console.log(`✅ Todas las ${totalPages} páginas renderizadas`);
        
        // El scroll SIEMPRE empieza en página 1 (estilo Lezhin)
        const lastReadPage = pageNum;
        pageNum = 1;
        
        if (lastReadPage > 1) {
            console.log(`ℹ️ Última lectura: página ${lastReadPage} (desliza o usa el slider para continuar)`);
        }
        
        // Actualizar UI
        updatePageInfo();
        
        // Activar observer de scroll
        attachScrollObserver();
        console.log('✅ Observer de scroll activado - Scroll 100% libre');
        
        // ASEGURAR que el flag programático esté en false
        isProgrammaticScroll = false;
        console.log(`🔧 isProgrammaticScroll = ${isProgrammaticScroll}`);
        
        // FORZAR scroll al inicio (página 1)
        const container = document.getElementById('pdf-container');
        container.scrollTop = 0;
        console.log(`📍 Scroll forzado a top: container.scrollTop = ${container.scrollTop}`);
        
        // Verificar que la primera página esté visible
        const firstPage = pagesContainer.querySelector('[data-page-number="1"]');
        if (firstPage) {
            console.log(`✅ Primera página encontrada, posición: offsetTop=${firstPage.offsetTop}`);
        }
        
        // OCULTAR pantalla de carga
        if (loadingText) loadingText.textContent = '¡Listo!';
        if (loadingProgress) loadingProgress.textContent = 'Disfruta tu lectura';
        
        setTimeout(() => {
            document.getElementById('loading-indicator').style.display = 'none';
            console.log('🎉 Visor listo para usar');
            console.log(`📊 Estado final: scrollTop=${container.scrollTop}, pageNum=${pageNum}, isProgrammaticScroll=${isProgrammaticScroll}`);
        }, 500);
    });
}

function exitScrollMode() {
    detachScrollObserver();
    // Limpiar páginas renderizadas
    pagesContainer.innerHTML = '';
}

// Renderizar página
function renderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
        return;
    }
    pageRendering = true;

    pdfDoc.getPage(num).then((page) => {
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTask.promise.then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
            
            // Actualizar UI
            updatePageInfo();
            
            // Guardar progreso
            saveProgress();
        });
    });
}

// LAZY LOADING: Crear placeholders para todas las páginas
async function createPagePlaceholders() {
    if (!pdfDoc) return;
    
    // Calcular altura estimada de cada página
    const firstPage = await pdfDoc.getPage(1);
    const viewport = firstPage.getViewport({ scale });
    const estimatedHeight = viewport.height;
    const estimatedWidth = viewport.width;

    // Crear placeholders para todas las páginas
    for (let n = 1; n <= pdfDoc.numPages; n++) {
        const placeholder = document.createElement('div');
        placeholder.className = 'page-placeholder';
        placeholder.dataset.pageNumber = String(n);
        placeholder.dataset.rendered = 'false';
        placeholder.style.width = '100%';
        placeholder.style.maxWidth = estimatedWidth + 'px';
        placeholder.style.height = estimatedHeight + 'px';
        placeholder.style.margin = '4px auto';
        placeholder.style.backgroundColor = '#f0f0f0';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.color = '#999';
        placeholder.style.fontSize = '14px';
        placeholder.textContent = `Página ${n}`;
        
        pagesContainer.appendChild(placeholder);
    }
    updatePageInfo();
}

// Renderizar solo las páginas visibles + buffer
async function renderVisiblePages() {
    if (!pdfDoc) return;
    
    const container = document.getElementById('pdf-container');
    const containerRect = container.getBoundingClientRect();
    const placeholders = Array.from(pagesContainer.querySelectorAll('.page-placeholder'));
    
    console.log(`🎨 renderVisiblePages: revisando ${placeholders.length} páginas`);
    let rendered = 0;
    
    for (const placeholder of placeholders) {
        const rect = placeholder.getBoundingClientRect();
        const pageNum = parseInt(placeholder.dataset.pageNumber);
        
        // Renderizar si está visible o cerca (buffer de 2 páginas arriba/abajo)
        const buffer = containerRect.height * 2;
        const isNearViewport = rect.top < containerRect.bottom + buffer && 
                               rect.bottom > containerRect.top - buffer;
        
        if (isNearViewport && placeholder.dataset.rendered === 'false') {
            console.log(`  → Renderizando página ${pageNum}`);
            await renderPageInPlaceholder(pageNum, placeholder);
            rendered++;
        }
    }
    
    if (rendered > 0) {
        console.log(`✅ ${rendered} páginas renderizadas`);
    }
}

// Renderizar una página específica en su placeholder
async function renderPageInPlaceholder(num, placeholder) {
    if (!pdfDoc) return;
    
    try {
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale });
        
        // Crear canvas
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = viewport.width;
        pageCanvas.height = viewport.height;
        pageCanvas.dataset.pageNumber = String(num);
        pageCanvas.style.maxWidth = '100%';
        pageCanvas.style.height = 'auto';
        pageCanvas.style.display = 'block';
        
        const pageCtx = pageCanvas.getContext('2d');
        await page.render({ canvasContext: pageCtx, viewport }).promise;
        
        // Reemplazar placeholder con canvas
        placeholder.innerHTML = '';
        placeholder.appendChild(pageCanvas);
        placeholder.style.height = 'auto';
        placeholder.style.backgroundColor = 'transparent';
        placeholder.dataset.rendered = 'true';
    } catch (error) {
        console.error(`Error renderizando página ${num}:`, error);
    }
}

// Renderizar todas las páginas (modo scroll) - DEPRECADO, usar lazy loading
async function renderAllPages() {
    console.warn('renderAllPages está deprecado, usar createPagePlaceholders + renderVisiblePages');
    if (!pdfDoc) return;
    // Render secuencial para no bloquear demasiado
    for (let n = 1; n <= pdfDoc.numPages; n++) {
        const page = await pdfDoc.getPage(n);
        const viewport = page.getViewport({ scale });
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = viewport.width;
        pageCanvas.height = viewport.height;
        pageCanvas.dataset.pageNumber = String(n);
        pageCanvas.style.maxWidth = '100%';
        pageCanvas.style.height = 'auto';

        pagesContainer.appendChild(pageCanvas);
        const pageCtx = pageCanvas.getContext('2d');
        await page.render({ canvasContext: pageCtx, viewport }).promise;
    }

    // Actualizar UI
    updatePageInfo();
}

function rerenderAllPages() {
    // Al cambiar zoom, resetear placeholders y re-renderizar visibles
    if (!pdfDoc) return;
    const current = determineCurrentPageFromScroll();
    
    // Limpiar y recrear placeholders con nuevo scale
    pagesContainer.innerHTML = '';
    createPagePlaceholders().then(() => {
        // Volver a la página actual
        if (current) {
            scrollToPage(current.page, false);
        }
        // Renderizar visibles
        renderVisiblePages();
        updatePageInfo();
    });
}

let rerenderTimeout = null;
function debounceRerenderAllPages() {
    clearTimeout(rerenderTimeout);
    rerenderTimeout = setTimeout(() => rerenderAllPages(), 200);
}

// Cambiar página
function changePage(delta) {
    goToPage(pageNum + delta);
}

// Ir a página específica
function goToPage(num) {
    if (num < 1 || num > pdfDoc.numPages) return;
    pageNum = num;
    if (readingMode === 'scroll') {
        scrollToPage(pageNum, true);
    } else {
        renderPage(pageNum);
    }
}

// Actualizar información de página
function updatePageInfo() {
    const totalPages = pdfDoc ? pdfDoc.numPages : 0;
    console.log(`🔄 updatePageInfo llamada - pageNum=${pageNum}, totalPages=${totalPages}`);
    
    // Actualizar solo el número de página visible
    document.getElementById('page-num').textContent = pageNum;
    document.getElementById('page-count').textContent = totalPages;
    
    // TEMPORALMENTE: NO actualizar el slider para ver si ese es el problema
    console.log(`  ⚠️ Slider NO se actualiza (debug)`);
    
    /*
    const slider = document.getElementById('page-slider');
    slider.value = pageNum;
    updateSliderVisuals();
    */
    
    // Actualizar botones de navegación
    updateNavigationButtons();
}

// Actualizar visuales del slider (estilo Lezhin)
function updateSliderVisuals() {
    const totalPages = pdfDoc ? pdfDoc.numPages : 100;
    const progress = ((pageNum - 1) / Math.max(1, totalPages - 1)) * 100;
    
    const track = document.getElementById('slider-track');
    const thumb = document.getElementById('slider-thumb');
    
    if (track) {
        track.style.width = `${progress}%`;
    }
    if (thumb) {
        thumb.style.left = `${progress}%`;
    }
}

// Actualizar estado de botones de navegación
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.disabled = pageNum <= 1;
    }
    if (nextBtn) {
        nextBtn.disabled = pageNum >= (pdfDoc ? pdfDoc.numPages : 1);
    }
}

// Cambiar zoom
function changeZoom(delta) {
    scale = Math.max(0.5, Math.min(5, scale + delta));
    updateZoomDisplay();
    if (readingMode === 'scroll') {
        rerenderAllPages();
    } else {
        renderPage(pageNum);
    }
}

// Actualizar display de zoom
function updateZoomDisplay() {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(scale * 100 / 1.5) + '%';
    }
}

// Toggle UI visibility
function toggleUI() {
    uiVisible = !uiVisible;
    const overlay = document.getElementById('ui-overlay');
    
    if (uiVisible) {
        overlay.classList.remove('ui-hidden');
        overlay.classList.add('ui-visible');
        resetAutoHideUI();
    } else {
        overlay.classList.remove('ui-visible');
        overlay.classList.add('ui-hidden');
        clearTimeout(autoHideTimer);
    }
}

// Auto-hide UI después de inactividad
function setupAutoHideUI() {
    const events = ['mousemove', 'touchstart', 'keydown'];
    events.forEach(event => {
        document.addEventListener(event, resetAutoHideUI);
    });
}

function resetAutoHideUI() {
    if (!uiVisible) {
        toggleUI();
    }
    
    clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(() => {
        if (uiVisible) {
            toggleUI();
        }
    }, 3000); // Ocultar después de 3 segundos de inactividad
}

// Guardar progreso de lectura
let saveProgressTimeout = null;
async function saveProgress() {
    // Debounce: guardar 500ms después del último cambio de página (más rápido)
    clearTimeout(saveProgressTimeout);
    
    saveProgressTimeout = setTimeout(async () => {
        try {
            await fetch(`/api/volumes/${volumeId}/progress`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    current_page: pageNum,
                    total_pages: pdfDoc.numPages
                })
            });
        } catch (error) {
            console.error('Error al guardar progreso:', error);
        }
    }, 500); // Reducido de 1000ms a 500ms para guardar más rápido
}

// Mostrar error
function showError(message) {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.innerHTML = `
        <div class="flex flex-col items-center gap-4 p-6 text-center">
            <span class="material-symbols-outlined text-6xl text-red-500">error</span>
            <p class="text-ui-light dark:text-ui-dark text-lg font-medium">${message}</p>
            <button onclick="window.location.href='/'" class="px-6 py-3 bg-primary text-white rounded-lg font-medium">
                Volver a la biblioteca
            </button>
        </div>
    `;
}

// Guardar progreso al salir
window.addEventListener('beforeunload', () => {
    if (volumeId && pageNum) {
        navigator.sendBeacon(`/api/volumes/${volumeId}/progress`, JSON.stringify({
            current_page: pageNum,
            total_pages: pdfDoc?.numPages || 0
        }));
    }
});

// Helpers modo scroll
function attachScrollObserver() {
    const container = document.getElementById('pdf-container');
    let scrollTimeout = null;
    let updateTimeout = null;
    
    const onScroll = () => {
        // SIEMPRE mostrar el estado del flag
        if (isProgrammaticScroll) {
            console.warn('🚫 BLOQUEADO - isProgrammaticScroll=true, scrollTop:', container.scrollTop);
            console.log('    ↑ EL SCROLL ESTÁ SIENDO BLOQUEADO POR EL FLAG');
            return;
        }
        
        // Solo log si el scroll es significativo (más de 50px de cambio)
        const lastScrollTop = container._lastScrollTop || 0;
        if (Math.abs(container.scrollTop - lastScrollTop) > 50) {
            console.log('✅ Scroll manual PERMITIDO - scrollTop:', container.scrollTop, `(isProgrammaticScroll=${isProgrammaticScroll})`);
            container._lastScrollTop = container.scrollTop;
        }
        
        // Debounce para actualizar la página actual (evitar spam)
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            const info = determineCurrentPageFromScroll();
            if (info && info.page !== pageNum) {
                console.log(`📄 Página ${info.page} visible (anterior: ${pageNum})`);
                
                // IMPORTANTE: Solo actualizar el indicador, NUNCA forzar scroll
                // Esta es la lógica de Lezhin: scroll libre, indicador sigue al usuario
                pageNum = info.page;
                updatePageInfo(); // Solo actualiza UI, no hace scroll
                saveProgress();
            }
        }, 150); // Reducido a 150ms para mejor respuesta
        
        // Renderizar páginas visibles con debounce
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            renderVisiblePages();
        }, 150);
    };
    
    container.addEventListener('scroll', onScroll);
    // Guardar para remover si cambiamos modo
    scrollObserver = { onScroll };
}

function detachScrollObserver() {
    const container = document.getElementById('pdf-container');
    if (scrollObserver?.onScroll) {
        container.removeEventListener('scroll', scrollObserver.onScroll);
    }
    scrollObserver = null;
}

function determineCurrentPageFromScroll() {
    const container = document.getElementById('pdf-container');
    const containerRect = container.getBoundingClientRect();
    const viewportCenter = containerRect.top + containerRect.height / 2;
    
    // Buscar tanto en canvas como en placeholders
    const elements = Array.from(pagesContainer.querySelectorAll('[data-page-number]'));
    let bestPage = 1;
    let bestDist = Infinity;
    
    for (const el of elements) {
        const rect = el.getBoundingClientRect();
        // Usar el centro de la página para mejor detección
        const pageCenter = rect.top + rect.height / 2;
        const dist = Math.abs(pageCenter - viewportCenter);
        const page = parseInt(el.dataset.pageNumber || '1');
        
        if (dist < bestDist) {
            bestDist = dist;
            bestPage = page;
        }
    }
    return { page: bestPage };
}

// Función para scroll por interacción del usuario (slider, botones)
// NUNCA se llama automáticamente, solo cuando el usuario usa controles
function scrollToPage(num, smooth = false) {
    console.log(`📍 Scroll interactivo a página ${num}: smooth=${smooth}`);
    console.trace('↑ Stack trace de scrollToPage');
    
    const target = pagesContainer.querySelector(`[data-page-number='${num}']`);
    if (!target) {
        console.warn(`❌ No se encontró la página ${num}`);
        return;
    }
    
    const container = document.getElementById('pdf-container');
    let targetTop = 0;
    let element = target;
    
    while (element && element !== container) {
        targetTop += element.offsetTop;
        element = element.offsetParent;
    }
    
    console.log(`  → targetTop=${targetTop}, currentScrollTop=${container.scrollTop}`);
    
    // Activar flag para que el observer ignore este scroll
    isProgrammaticScroll = true;
    
    if (smooth) {
        container.scrollTo({
            top: targetTop,
            behavior: 'smooth'
        });
        setTimeout(() => {
            isProgrammaticScroll = false;
            console.log('✅ Flag isProgrammaticScroll desactivado (smooth)');
        }, 800);
    } else {
        container.scrollTop = targetTop;
        setTimeout(() => {
            isProgrammaticScroll = false;
            console.log('✅ Flag isProgrammaticScroll desactivado (instantáneo)');
        }, 100);
    }
    
    console.log(`✅ Scroll aplicado: container.scrollTop=${container.scrollTop}`);
    
    if (target.classList.contains('page-placeholder') && target.dataset.rendered === 'false') {
        renderPageInPlaceholder(num, target);
    }
    
    setTimeout(() => {
        renderVisiblePages();
    }, 100);
    
    // Actualizar pageNum y UI solo después del scroll
    pageNum = num;
    updatePageInfo();
    saveProgress();
}

// Guardar preferencia de modo de lectura en el servidor (por serie)
async function saveReadingModeToServer(mode) {
    try {
        // Obtener series_id del volumen actual
        const volResp = await fetch(`/api/volumes/${volumeId}`);
        if (!volResp.ok) return;
        const volume = await volResp.json();
        
        // Guardar en la serie
        const response = await fetch(`/api/series/${volume.series_id}/reading-mode`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reading_mode: mode })
        });
        
        if (!response.ok) {
            console.error('Error al guardar modo de lectura');
        }
    } catch (error) {
        console.error('Error al guardar modo de lectura:', error);
    }
}
