#!/usr/bin/env python3
"""
Script para procesar en lote archivos PDF de manga desde una carpeta
"""
import os
import sys
import time
from pathlib import Path

# Agregar el directorio actual al path para importar los módulos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
import gemini_organizer

def procesar_lote():
    """Procesa todos los PDFs de la carpeta 'Lote grande'"""
    
    lote_carpeta = "/opt/MangaRead/manga-organizer/Lote grande"
    destino = config.MANGA_DESTINATION
    
    print("\n" + "="*80)
    print("🚀 PROCESAMIENTO EN LOTE - MANGA ORGANIZER")
    print("="*80)
    print(f"📁 Carpeta origen: {lote_carpeta}")
    print(f"📚 Carpeta destino: {destino}")
    print(f"🤖 Modelo: {config.GEMINI_MODEL}")
    print(f"🔑 API Keys disponibles: {len(config.GOOGLE_API_KEYS)}")
    print("="*80 + "\n")
    
    # Buscar todos los archivos PDF
    print("🔍 Buscando archivos PDF...")
    pdf_files = []
    for root, dirs, files in os.walk(lote_carpeta):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    total = len(pdf_files)
    
    if total == 0:
        print("❌ No se encontraron archivos PDF en la carpeta")
        return
    
    print(f"✅ Se encontraron {total} archivos PDF\n")
    
    # Confirmar antes de procesar
    print("⚠️  IMPORTANTE:")
    print("   - Los archivos se MOVERÁN (no se copiarán)")
    print("   - Se organizarán en carpetas por serie")
    print("   - Se renombrarán automáticamente")
    print(f"   - Se procesarán {total} archivos\n")
    
    respuesta = input("¿Deseas continuar? (s/N): ")
    if respuesta.lower() not in ['s', 'si', 'sí', 'y', 'yes']:
        print("❌ Operación cancelada")
        return
    
    print("\n" + "="*80)
    print("🎬 INICIANDO PROCESAMIENTO")
    print("="*80 + "\n")
    
    inicio = time.time()
    
    # Procesar archivos
    resultados = gemini_organizer.procesar_multiples_archivos(pdf_files, destino)
    
    fin = time.time()
    tiempo_total = fin - inicio
    
    # Resumen final
    exitosos = sum(1 for r in resultados if r.get('success'))
    fallidos = total - exitosos
    
    print("\n" + "="*80)
    print("📊 RESUMEN FINAL DEL PROCESAMIENTO")
    print("="*80)
    print(f"⏱️  Tiempo total: {tiempo_total:.2f} segundos ({tiempo_total/60:.2f} minutos)")
    print(f"📦 Total procesados: {total}")
    print(f"✅ Exitosos: {exitosos} ({(exitosos/total*100):.1f}%)")
    print(f"❌ Fallidos: {fallidos} ({(fallidos/total*100):.1f}%)")
    print("="*80 + "\n")
    
    # Guardar reporte
    reporte_path = "/opt/MangaRead/manga-organizer/reporte-lote-grande.txt"
    print(f"💾 Guardando reporte en: {reporte_path}")
    
    with open(reporte_path, 'w', encoding='utf-8') as f:
        f.write("REPORTE DE PROCESAMIENTO EN LOTE - MANGA ORGANIZER\n")
        f.write("="*80 + "\n\n")
        f.write(f"Fecha: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Carpeta origen: {lote_carpeta}\n")
        f.write(f"Carpeta destino: {destino}\n")
        f.write(f"Modelo usado: {config.GEMINI_MODEL}\n")
        f.write(f"Tiempo total: {tiempo_total:.2f} segundos\n")
        f.write(f"\n{'='*80}\n\n")
        f.write(f"RESUMEN:\n")
        f.write(f"  Total: {total}\n")
        f.write(f"  Exitosos: {exitosos}\n")
        f.write(f"  Fallidos: {fallidos}\n")
        f.write(f"\n{'='*80}\n\n")
        
        if exitosos > 0:
            f.write(f"ARCHIVOS PROCESADOS EXITOSAMENTE ({exitosos}):\n\n")
            for i, r in enumerate([r for r in resultados if r.get('success')], 1):
                f.write(f"{i}. {r['original_name']}\n")
                f.write(f"   → Carpeta: {r['folder']}\n")
                f.write(f"   → Nuevo nombre: {r['new_name']}\n")
                f.write(f"   → Capítulo: {r['chapter']}\n")
                if r.get('is_extra'):
                    f.write(f"   → [EXTRA/SECUELA]\n")
                f.write(f"   → Ruta: {r['full_path']}\n\n")
        
        if fallidos > 0:
            f.write(f"\n{'='*80}\n\n")
            f.write(f"ARCHIVOS CON ERROR ({fallidos}):\n\n")
            for i, r in enumerate([r for r in resultados if not r.get('success')], 1):
                f.write(f"{i}. {r['original_name']}\n")
                f.write(f"   ✗ Error: {r.get('error', 'Error desconocido')}\n\n")
    
    print(f"✅ Reporte guardado\n")
    
    if exitosos > 0:
        print(f"🎉 ¡Procesamiento completado!")
        print(f"📁 Los archivos están organizados en: {destino}")
    
    if fallidos > 0:
        print(f"\n⚠️  Hubo {fallidos} archivo(s) con error. Revisa el reporte para más detalles.")

if __name__ == "__main__":
    try:
        procesar_lote()
    except KeyboardInterrupt:
        print("\n\n❌ Procesamiento interrumpido por el usuario")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error fatal: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
