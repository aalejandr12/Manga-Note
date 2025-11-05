#!/usr/bin/env python3
"""
Script para renombrar archivos 'ONE_SHOT' a 'Cap. 1' si existen otros capítulos en la misma carpeta.
"""

import os
import re

MANGAS_BASE = '/opt/MangaRead/Mangas'

def renombrar_one_shot_a_cap1():
    print("=" * 80)
    print("🔄 RENOMBRADOR DE ONE_SHOT A CAP. 1")
    print("=" * 80)
    print(f"📂 Ruta base: {MANGAS_BASE}\n")

    carpetas_procesadas = 0
    archivos_renombrados = 0

    for serie_folder in os.listdir(MANGAS_BASE):
        serie_path = os.path.join(MANGAS_BASE, serie_folder)

        if os.path.isdir(serie_path):
            carpetas_procesadas += 1
            print(f"🔍 Procesando carpeta: {serie_folder}")

            pdf_files = []
            one_shot_file = None
            has_numbered_chapter = False

            # Buscar archivos PDF y clasificar
            for filename in os.listdir(serie_path):
                if filename.lower().endswith('.pdf'):
                    pdf_files.append(filename)
                    if "one_shot" in filename.lower():
                        one_shot_file = filename
                    # Patrón para detectar capítulos numerados (Cap. 2, Capítulo 2, etc.)
                    if re.search(r'cap[.]?\s*\d+', filename.lower()) and "one_shot" not in filename.lower():
                        has_numbered_chapter = True
            
            # Lógica de renombramiento
            if one_shot_file and has_numbered_chapter:
                # Construir el nuevo nombre
                base_name, ext = os.path.splitext(one_shot_file)
                # Intentar mantener el nombre de la serie si es posible
                match_serie = re.match(r'(.*?)\s*[-_]?\s*cap[.]?\s*one_shot', base_name, re.IGNORECASE)
                if match_serie:
                    new_base_name = f"{match_serie.group(1).strip()} - Cap. 1"
                else:
                    # Si no se puede extraer la serie, usar el nombre de la carpeta
                    new_base_name = f"{serie_folder} - Cap. 1"
                
                new_filename = f"{new_base_name}{ext}"
                new_filepath = os.path.join(serie_path, new_filename)
                old_filepath = os.path.join(serie_path, one_shot_file)

                if not os.path.exists(new_filepath):
                    print(f"  ➡️  Renombrando '{one_shot_file}' a '{new_filename}'")
                    os.rename(old_filepath, new_filepath)
                    archivos_renombrados += 1
                else:
                    print(f"  ⚠️  No se pudo renombrar '{one_shot_file}' a '{new_filename}' (ya existe)")
            elif one_shot_file and not has_numbered_chapter:
                print(f"  ℹ️  '{one_shot_file}' se mantiene como ONE_SHOT (no hay otros capítulos numerados)")
            elif not one_shot_file and has_numbered_chapter:
                print(f"  ℹ️  No hay ONE_SHOT en esta carpeta, pero sí capítulos numerados.")
            else:
                print(f"  ℹ️  No se encontraron condiciones para renombrar en esta carpeta.")

    print("\n" + "=" * 80)
    print(f"✅ PROCESO COMPLETADO")
    print(f"📊 {carpetas_procesadas} carpetas procesadas")
    print(f"📝 {archivos_renombrados} archivos renombrados")
    print("=" * 80)

if __name__ == "__main__":
    renombrar_one_shot_a_cap1()
