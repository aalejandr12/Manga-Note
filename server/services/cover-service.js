const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CoverService {
  constructor(coversDir = './uploads/covers') {
    this.coversDir = coversDir;
    this.ensureCoversDir();
  }

  async ensureCoversDir() {
    try {
      await fs.mkdir(this.coversDir, { recursive: true });
    } catch (error) {
      console.error('Error creando directorio de portadas:', error);
    }
  }

  /**
   * Busca portadas en DuckDuckGo (no requiere API key)
   */
  async searchCoverImage(title, author = null) {
    try {
      // Construir query de búsqueda
      let query = `${title} manga cover`;
      if (author) {
        query = `${title} ${author} manga cover`;
      }

      // DuckDuckGo Image Search (usando vqd token simplificado)
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
      
      // Por ahora, generar URL de búsqueda para que el usuario pueda buscar manualmente
      // En producción, podrías usar servicios como:
      // - Google Custom Search API (requiere API key)
      // - Bing Image Search API (requiere API key)
      // - Web scraping (más complejo y puede violar TOS)
      
      console.log(`🔍 Búsqueda de portada: ${searchUrl}`);
      
      // Retornar null por ahora; implementar scraping real requeriría más dependencias
      return null;
    } catch (error) {
      console.error('Error buscando portada:', error);
      return null;
    }
  }

  /**
   * Descarga una imagen desde URL y la guarda localmente
   */
  async downloadCover(imageUrl, seriesTitle) {
    try {
      await this.ensureCoversDir();

      // Generar nombre de archivo único
      const hash = crypto.createHash('md5').update(seriesTitle).digest('hex');
      const ext = path.extname(imageUrl).split('?')[0] || '.jpg';
      const filename = `${hash}${ext}`;
      const filepath = path.join(this.coversDir, filename);

      // Verificar si ya existe
      try {
        await fs.access(filepath);
        console.log(`✓ Portada ya existe: ${filename}`);
        return `/uploads/covers/${filename}`;
      } catch {
        // No existe, continuar con descarga
      }

      // Descargar imagen
      const imageData = await this._downloadFromUrl(imageUrl);
      await fs.writeFile(filepath, imageData);

      console.log(`✓ Portada descargada: ${filename}`);
      return `/uploads/covers/${filename}`;
    } catch (error) {
      console.error('Error descargando portada:', error);
      return null;
    }
  }

  /**
   * Descarga datos desde una URL
   */
  _downloadFromUrl(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (compatible; MangaLibraryBot/1.0)' 
        } 
      }, (response) => {
        // Seguir redirecciones
        if (response.statusCode === 301 || response.statusCode === 302) {
          return this._downloadFromUrl(response.headers.location)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Status: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Extrae la primera página de un PDF como imagen para usarla de portada
   */
  async extractPDFCover(pdfPath, seriesTitle) {
    try {
      // Esto requeriría pdf-poppler o similar para convertir PDF → imagen
      // Por ahora, retornamos null y usamos un placeholder
      
      // Si quieres implementarlo:
      // 1. npm install pdf-poppler
      // 2. const poppler = require('pdf-poppler');
      // 3. await poppler.convert(pdfPath, { format: 'jpeg', out_dir: this.coversDir, out_prefix: hash, page_range: '1-1' });
      
      console.log(`⚠ Extracción de portada desde PDF no implementada aún: ${pdfPath}`);
      return null;
    } catch (error) {
      console.error('Error extrayendo portada del PDF:', error);
      return null;
    }
  }

  /**
   * Obtiene una portada: primero intenta buscar online, luego del PDF
   */
  async getCover(title, author = null, pdfPath = null) {
    // Intentar buscar online
    const onlineCover = await this.searchCoverImage(title, author);
    if (onlineCover) {
      return { source: 'online', path: onlineCover };
    }

    // Si hay PDF, intentar extraer primera página
    if (pdfPath) {
      const pdfCover = await this.extractPDFCover(pdfPath, title);
      if (pdfCover) {
        return { source: 'pdf', path: pdfCover };
      }
    }

    // Usar placeholder
    return { source: 'placeholder', path: null };
  }

  /**
   * URLs de portadas de ejemplo (MyAnimeList, AniList, etc.)
   * Podrías integrar APIs de estos servicios
   */
  getPlaceholderCover(genre = 'manga') {
    const placeholders = {
      yaoi: '/assets/placeholder-yaoi.jpg',
      manga: '/assets/placeholder-manga.jpg',
      manhwa: '/assets/placeholder-manhwa.jpg',
      manhua: '/assets/placeholder-manhua.jpg'
    };
    return placeholders[genre.toLowerCase()] || placeholders.manga;
  }
}

module.exports = CoverService;
