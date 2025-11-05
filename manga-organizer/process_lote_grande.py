#!/usr/bin/env python3
"""
Script para procesar archivos PDF en lote desde la carpeta "Lote grande"
y organizarlos automáticamente en /opt/MangaRead/Mangas
"""
import os
import sys
import time
from pathlib import Path

# Agregar el directorio actual al path para importar módulos
sys.path.insert(0, '/opt/MangaRead/manga-organizer')

import config
import gemini_organizer

def main():
    lote_grande_path = "/opt/MangaRead/manga-organizer/Lote grande"
    destino_path = config.MANGA_DESTINATION
    
    print("="*80)
    print("🚀 PROCESAMIENTO EN LOTE DE MANGAS")
    print("="*80)
    print(f"📁 Carpeta origen: {lote_grande_path}")
    print(f"📚 Carpeta destino: {destino_path}")
    print(f"🤖 Modelo: {config.GEMINI_MODEL}")
    print(f"🔑 API Keys disponibles: {len(config.GOOGLE_API_KEYS)}")
    print("="*80)
    
    # Buscar todos los archivos PDF
    print("\n🔍 Buscando archivos PDF...")
    pdf_files = []
    for root, dirs, files in os.walk(lote_grande_path):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    total = len(pdf_files)
    
    if total == 0:
        print("❌ No se encontraron archivos PDF en la carpeta")
        return
    
    print(f"✅ Se encontraron {total} archivos PDF")
    print("\n" + "="*80)
    
    # Confirmar antes de procesar
    respuesta = input(f"\n¿Procesar {total} archivos? (s/n): ").strip().lower()
    if respuesta != 's':
        print("❌ Operación cancelada")
        return
    
    print("\n" + "="*80)
    print(f"⚙️  INICIANDO PROCESAMIENTO DE {total} ARCHIVOS")
    print("="*80)
    
    # Procesar archivos
    resultados = []
    exitosos = 0
    fallidos = 0
    
    tiempo_inicio = time.time()
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"\n{'='*80}")
        print(f"📄 [{i}/{total}] Procesando archivo {i} de {total}")
        print(f"{'='*80}")
        
        resultado = gemini_organizer.organizar_manga(pdf_path, destino_path)
        resultados.append(resultado)
        
        if resultado['success']:
            exitosos += 1
            print(f"✅ [{i}/{total}] Completado exitosamente")
        else:
            fallidos += 1
            print(f"❌ [{i}/{total}] Error: {resultado.get('error', 'Error desconocido')}")
        
        # Mostrar progreso
        porcentaje = (i / total) * 100
        tiempo_transcurrido = time.time() - tiempo_inicio
        tiempo_promedio = tiempo_transcurrido / i
        tiempo_restante = tiempo_promedio * (total - i)
        
        print(f"\n📊 Progreso: {porcentaje:.1f}% ({i}/{total})")
        print(f"✅ Exitosos: {exitosos} | ❌ Fallidos: {fallidos}")
        print(f"⏱️  Tiempo transcurrido: {int(tiempo_transcurrido)}s")
        print(f"⏰ Tiempo estimado restante: {int(tiempo_restante)}s ({int(tiempo_restante/60)}min)")
    
    # Resumen final
    tiempo_total = time.time() - tiempo_inicio
    
    print("\n" + "="*80)
    print("📊 RESUMEN FINAL")
    print("="*80)
    print(f"✅ Archivos procesados exitosamente: {exitosos}/{total}")
    print(f"❌ Archivos con error: {fallidos}/{total}")
    print(f"⏱️  Tiempo total: {int(tiempo_total)}s ({int(tiempo_total/60)}min {int(tiempo_total%60)}s)")
    print("="*80)
    
    # Generar reporte
    print("\n💾 Generando reporte...")
    reporte_path = "/opt/MangaRead/manga-organizer/reporte-lote-grande.txt"
    
    with open(reporte_path, 'w', encoding='utf-8') as f:
        f.write("="*80 + "\n")
        f.write("REPORTE DE PROCESAMIENTO EN LOTE - MANGA ORGANIZER\n")
        f.write("="*80 + "\n\n")
        f.write(f"Fecha: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total de archivos: {total}\n")
        f.write(f"Exitosos: {exitosos}\n")
        f.write(f"Fallidos: {fallidos}\n")
        f.write(f"Tiempo total: {int(tiempo_total)}s\n")
        f.write("\n" + "="*80 + "\n\n")
        
        if exitosos > 0:
            f.write(f"ARCHIVOS PROCESADOS EXITOSAMENTE ({exitosos}):\n\n")
            for i, resultado in enumerate(resultados, 1):
                if resultado['success']:
                    f.write(f"{i}. {resultado['original_name']}\n")
                    f.write(f"   → Carpeta: {resultado['folder']}\n")
                    f.write(f"   → Nuevo nombre: {resultado['new_name']}\n")
                    f.write(f"   → Capítulo: {resultado['chapter']}\n")
                    if resultado.get('is_extra'):
                        f.write(f"   → [EXTRA/SECUELA]\n")
                    f.write(f"   → Ruta: {resultado.get('full_path', 'N/A')}\n\n")
        
        if fallidos > 0:
            f.write("\n" + "="*80 + "\n\n")
            f.write(f"ARCHIVOS CON ERROR ({fallidos}):\n\n")
            for i, resultado in enumerate(resultados, 1):
                if not resultado['success']:
                    f.write(f"{i}. {resultado['original_name']}\n")
                    f.write(f"   ✗ Error: {resultado['error']}\n\n")
        
        f.write("\n" + "="*80 + "\n")
        f.write("Fin del reporte\n")
    
    print(f"✅ Reporte guardado en: {reporte_path}")
    
    print("\n" + "="*80)
    print("🎉 PROCESO COMPLETADO")
    print("="*80)
    
    # Verificar si quedaron archivos en Lote grande
    archivos_restantes = len([f for f in os.listdir(lote_grande_path) if f.endswith('.pdf')])
    if archivos_restantes > 0:
        print(f"\n⚠️  Nota: Quedan {archivos_restantes} archivos en 'Lote grande'")
        print("   (Probablemente son los que dieron error)")
    else:
        print("\n✅ Todos los archivos fueron procesados y movidos")

if __name__ == "__main__":
    main()
