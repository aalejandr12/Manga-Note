// auto-cover-generator.js - Genera portadas automáticamente desde PDFs

/*
  Flujo:
  - Consulta /api/series
  - Para cada serie con cover_image="pdf:volumeId:pageNumber" carga el PDF del volumen
  - Renderiza la página indicada usando PDF.js, crea un Blob y lo sube a /api/series/:id/cover
*/

async function generateMissingCovers() {
  try {
    const response = await fetch('/api/series');
    if (!response.ok) throw new Error('No se pudo obtener /api/series');
    const series = await response.json();

    for (const s of series) {
      if (!s.cover_image || !s.cover_image.startsWith('pdf:')) continue;

      console.log('🎨 Generando portada para:', s.title || s.code || s.id);

      const parts = s.cover_image.split(':');
      if (parts.length < 3) {
        console.warn('Referencia de portada inválida:', s.cover_image);
        continue;
      }

      const volumeId = parts[1];
      const pageNumber = parseInt(parts[2]) || 1;

      try {
        const volRes = await fetch(`/api/volumes/${volumeId}`);
        if (!volRes.ok) {
          console.warn('No se pudo obtener volumen', volumeId, volRes.status);
          continue;
        }
        const volume = await volRes.json();
        if (!volume || !volume.file_path) {
          console.warn('Volumen inválido o sin file_path:', volumeId);
          continue;
        }

        // Cargar PDF con PDF.js
        const loadingTask = pdfjsLib.getDocument(volume.file_path);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageNumber);

        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (!blob) {
          console.error('No se pudo convertir canvas a blob para', s.id);
          continue;
        }

        const formData = new FormData();
        formData.append('image', blob, `cover-${s.id}.jpg`);

        const up = await fetch(`/api/series/${s.id}/cover`, { method: 'POST', body: formData });
        if (up.ok) {
          console.log('✅ Portada subida para serie', s.id);
          // Dejamos un pequeño delay para que el servidor actualice la BD antes de refrescar
          await new Promise(r => setTimeout(r, 600));
          // Opcional: recargar para que la nueva portada se muestre (se puede comentar si molesta)
          // window.location.reload();
        } else {
          const text = await up.text().catch(() => 'no body');
          console.error('Error al subir portada', up.status, text);
        }

      } catch (err) {
        console.error('Error procesando volumen para portada:', err);
      }
    }

    console.log('✅ Generación de portadas completada');

  } catch (err) {
    console.error('Error en generateMissingCovers:', err);
  }
}

// DESACTIVADO TEMPORALMENTE - NO ejecutar automáticamente
// Para activarlo, llama manualmente desde consola: generateMissingCovers()
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => setTimeout(generateMissingCovers, 2000));
// } else {
//   setTimeout(generateMissingCovers, 2000);
// }
