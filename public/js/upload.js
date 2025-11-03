// upload.js - Frontend para subir PDFs

let selectedFiles = [];
let uploading = false;

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkGeminiStatus();
});

function setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadBtn = document.getElementById('uploadBtn');

    // Click en área de subida
    uploadArea.addEventListener('click', () => {
        if (!uploading) fileInput.click();
    });

    // Click en botón Browse
    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // Selección de archivos
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // Botón de subida
    uploadBtn.addEventListener('click', uploadFiles);
}

// Verificar estado de Gemini
async function checkGeminiStatus() {
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        
        if (!data.gemini_configured) {
            showWarning('⚠️ Gemini AI no configurado. Los archivos se procesarán con análisis básico. Configura tu API key en Ajustes para mejor precisión.');
        }
    } catch (error) {
        console.error('Error al verificar Gemini:', error);
    }
}

// Manejar archivos seleccionados
function handleFiles(files) {
    const fileArray = Array.from(files).filter(f => f.type === 'application/pdf');
    
    if (fileArray.length === 0) {
        showError('Por favor selecciona archivos PDF válidos');
        return;
    }


    selectedFiles = fileArray;
    displaySelectedFiles();
    document.getElementById('uploadBtn').disabled = false;
}

// Mostrar archivos seleccionados
function displaySelectedFiles() {
    const progressSection = document.getElementById('progressSection');
    const uploadsList = document.getElementById('uploadsList');
    
    progressSection.classList.remove('hidden');
    progressSection.classList.add('flex');

    uploadsList.innerHTML = selectedFiles.map((file, index) => `
        <div id="upload-${index}" class="flex items-start justify-between gap-4 p-3 rounded-lg bg-gray-100 dark:bg-[#362447] border border-border-light dark:border-border-dark">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="material-symbols-outlined text-2xl text-text-light-secondary dark:text-text-dark-secondary">picture_as_pdf</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">${file.name}</p>
                    <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${formatFileSize(file.size)}</p>
                    <div id="progress-bar-${index}" class="hidden mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-primary transition-all duration-300" style="width: 0%;"></div>
                    </div>
                    <p id="status-${index}" class="hidden text-xs mt-1"></p>
                </div>
            </div>
            <button onclick="removeFile(${index})" class="flex h-6 w-6 items-center justify-center text-text-light-secondary dark:text-text-dark-secondary hover:text-error transition-colors">
                <span class="material-symbols-outlined text-lg">close</span>
            </button>
        </div>
    `).join('');
}

// Remover archivo de la lista
function removeFile(index) {
    if (uploading) return;
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length === 0) {
        document.getElementById('progressSection').classList.add('hidden');
        document.getElementById('uploadBtn').disabled = true;
    } else {
        displaySelectedFiles();
    }
}

// Subir archivos
async function uploadFiles() {
    if (uploading || selectedFiles.length === 0) return;

    uploading = true;
    document.getElementById('uploadBtn').disabled = true;
    document.getElementById('uploadBtn').innerHTML = `
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Procesando...</span>
    `;

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const progressBar = document.querySelector(`#progress-bar-${i} > div`);
        const statusText = document.getElementById(`status-${i}`);
        
        // Mostrar progreso
        document.getElementById(`progress-bar-${i}`).classList.remove('hidden');
        statusText.classList.remove('hidden');
        statusText.textContent = 'Subiendo...';
        statusText.className = 'text-xs mt-1 text-primary';

        try {
            const formData = new FormData();
            formData.append('pdf', file);

            // Fase 1: Subir archivo
            statusText.textContent = '📤 Subiendo archivo...';
            progressBar.style.width = '20%';

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al subir archivo');
            }

            const result = await response.json();

            // Fase 2: Archivo subido, esperando análisis IA
            statusText.textContent = '🤖 Analizando con Gemini AI...';
            statusText.className = 'text-xs mt-1 text-primary animate-pulse';
            progressBar.style.width = '40%';

            // Fase 3: Monitorear procesamiento con IA en segundo plano
            const volumeId = result.volume_id;
            const seriesId = result.series_id;
            let processingComplete = false;
            let checkAttempts = 0;
            const maxAttempts = 60; // 60 intentos = ~2 minutos max

            while (!processingComplete && checkAttempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
                checkAttempts++;

                try {
                    // Consultar estado de procesamiento
                    const statusResponse = await fetch(`/api/processing-queue/status`);
                    const queueStatus = await statusResponse.json();

                    const itemStatus = queueStatus.statuses[`${seriesId}-${volumeId}`];
                    
                    if (itemStatus) {
                        if (itemStatus.status === 'completed') {
                            processingComplete = true;
                            progressBar.style.width = '100%';
                            statusText.textContent = `✓ ${result.analysis.title} - Análisis completado`;
                            statusText.className = 'text-xs mt-1 text-success';
                        } else if (itemStatus.status === 'error') {
                            processingComplete = true;
                            progressBar.style.width = '100%';
                            statusText.textContent = `⚠️ Subido (análisis pendiente)`;
                            statusText.className = 'text-xs mt-1 text-warning';
                        } else if (itemStatus.status === 'processing') {
                            const progress = 40 + (itemStatus.progress || 0) * 0.6; // 40% base + hasta 60% del procesamiento
                            progressBar.style.width = `${progress}%`;
                            statusText.textContent = `🤖 Procesando con IA... ${Math.round(itemStatus.progress || 0)}%`;
                        }
                    } else if (!queueStatus.isProcessing && queueStatus.pending === 0) {
                        // Cola vacía, procesamiento terminó
                        processingComplete = true;
                        progressBar.style.width = '100%';
                        statusText.textContent = `✓ ${result.analysis.title} - Análisis completado`;
                        statusText.className = 'text-xs mt-1 text-success';
                    } else {
                        // Todavía en cola
                        progressBar.style.width = '50%';
                        statusText.textContent = `⏳ En cola de procesamiento... (${queueStatus.pending} pendientes)`;
                    }
                } catch (statusError) {
                    console.error('Error al consultar estado:', statusError);
                    // Continuar intentando
                }
            }

            if (!processingComplete) {
                // Timeout pero archivo subido
                progressBar.style.width = '100%';
                statusText.textContent = `✓ Subido - Procesamiento en segundo plano`;
                statusText.className = 'text-xs mt-1 text-warning';
            }

            successCount++;

        } catch (error) {
            // Error
            progressBar.style.width = '100%';
            progressBar.classList.add('bg-error');
            statusText.textContent = `✗ Error: ${error.message}`;
            statusText.className = 'text-xs mt-1 text-error';
            errorCount++;
        }
    }

    // Finalizado
    uploading = false;
    
    if (successCount > 0) {
        showSuccess(`✓ ${successCount} manga${successCount > 1 ? 's' : ''} subido${successCount > 1 ? 's' : ''} correctamente`);
        
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }

    if (errorCount > 0) {
        showError(`✗ ${errorCount} archivo${errorCount > 1 ? 's' : ''} fallaron al subir`);
    }

    // Actualizar botón
    document.getElementById('uploadBtn').innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        Completado
    `;
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    showMessage(message, 'success');
}

// Mostrar mensaje de error
function showError(message) {
    showMessage(message, 'error');
}

// Mostrar mensaje de advertencia
function showWarning(message) {
    showMessage(message, 'warning');
}

// Mostrar mensaje
function showMessage(message, type) {
    const statusMessages = document.getElementById('statusMessages');
    
    const colors = {
        success: 'bg-success/10 text-success',
        error: 'bg-error/10 text-error',
        warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning'
    };

    const messageEl = document.createElement('div');
    messageEl.className = `flex items-center gap-2 rounded-lg p-3 text-sm ${colors[type]} animate-fade-in`;
    messageEl.innerHTML = `
        <span class="material-symbols-outlined text-base">${icons[type]}</span>
        <span>${message}</span>
    `;

    statusMessages.appendChild(messageEl);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        messageEl.style.opacity = '0';
        messageEl.style.transition = 'opacity 0.3s';
        setTimeout(() => messageEl.remove(), 300);
    }, 5000);
}

// Añadir estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }
`;
document.head.appendChild(style);
