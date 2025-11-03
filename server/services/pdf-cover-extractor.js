// pdf-cover-extractor.js - Servicio para extraer la primera página de un PDF como imagen de portada
// Usa PDF-lib para extraer páginas sin dependencias nativas complicadas

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PDFCoverExtractor {
  /**
   * Extrae la primera página de un PDF y la guarda como imagen usando ImageMagick
   * @param {string} pdfPath - Ruta del archivo PDF
   * @param {number} seriesId - ID de la serie para el nombre del archivo
   * @returns {Promise<string>} - Ruta de la imagen generada
   */
  async extractFirstPage(pdfPath, seriesId) {
    try {
      console.log('📄 Extrayendo primera página de:', path.basename(pdfPath));

      // Crear directorio de covers si no existe
      const coversDir = path.join(process.cwd(), 'uploads', 'covers');
      await fs.mkdir(coversDir, { recursive: true });

      const filename = `series-${seriesId}-${Date.now()}.jpg`;
      const coverPath = path.join(coversDir, filename);

      // Intentar usar pdftoppm (poppler) si está disponible — más confiable en servidores
      try {
        const outPrefix = coverPath.replace(/\.jpg$/i, '');
        const cmd = `pdftoppm -f 1 -singlefile -jpeg -r 150 "${pdfPath}" "${outPrefix}"`;
        await execAsync(cmd);
        const relativePath = `uploads/covers/${filename}`;
        // pdftoppm genera outPrefix.jpg
        console.log('✅ Portada extraída con pdftoppm:', relativePath);
        return relativePath;
      } catch (pdftoppmError) {
        console.log('⚠️ pdftoppm no disponible o falló, intentando ImageMagick...');
      }

      // Intentar usar ImageMagick (convert) si está disponible
      try {
        const command = `convert -density 150 "${pdfPath}[0]" -quality 90 -resize 800x "${coverPath}"`;
        await execAsync(command);
        const relativePath = `uploads/covers/${filename}`;
        console.log('✅ Portada extraída con ImageMagick:', relativePath);
        return relativePath;
      } catch (convertError) {
        console.log('⚠️ ImageMagick no disponible o falló, intentando método alternativo...');
      }

      // Método alternativo: extraer la primera página como PDF separado
      // y dejar que el frontend la renderice (no ideal pero funciona sin deps)
      const pdfData = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfData);
      
      // Crear nuevo PDF con solo la primera página
      const newPdf = await PDFDocument.create();
      const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
      newPdf.addPage(firstPage);
      
      const newPdfBytes = await newPdf.save();
      
      // Guardar como PDF (temporal)
      const tempPdfPath = coverPath.replace('.jpg', '.pdf');
      await fs.writeFile(tempPdfPath, newPdfBytes);
      
      console.log('ℹ️ Portada extraída como PDF (requiere conversión manual):', tempPdfPath);
      
      // Retornar null para indicar que no se pudo generar imagen
      return null;

    } catch (error) {
      console.error('❌ Error al extraer página del PDF:', error);
      return null;
    }
  }

  /**
   * Verifica si ImageMagick está disponible
   */
  async checkImageMagickAvailable() {
    try {
      await execAsync('convert -version');
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new PDFCoverExtractor();
