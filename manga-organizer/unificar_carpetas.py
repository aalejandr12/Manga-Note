#!/usr/bin/env python3
"""
Script para unificar carpetas de manga con nombres similares
Mueve todos los archivos de carpetas duplicadas a una carpeta canónica
"""

import os
import shutil
import unicodedata
import re
from collections import defaultdict

# Ruta base donde están las carpetas de mangas
MANGAS_BASE = '/opt/MangaRead/Mangas'

def normalizar_nombre(nombre):
    """
    Normaliza un nombre de carpeta para comparación:
    - Convierte a minúsculas
    - Elimina acentos
    - Elimina signos de puntuación (excepto espacios)
    - Elimina espacios extras
    """
    # Convertir a minúsculas
    nombre = nombre.lower()
    
    # Eliminar acentos
    nombre = ''.join(
        c for c in unicodedata.normalize('NFD', nombre)
        if unicodedata.category(c) != 'Mn'
    )
    
    # Eliminar signos de puntuación (¿?¡!.,;:'"()[]{}-)
    nombre = re.sub(r'[¿?¡!.,;:\'"()\[\]{}\-]', '', nombre)
    
    # Normalizar espacios
    nombre = ' '.join(nombre.split())
    
    return nombre

def encontrar_duplicados():
    """
    Encuentra carpetas con nombres similares
    Retorna un diccionario: nombre_normalizado -> [lista de carpetas originales]
    """
    carpetas = [d for d in os.listdir(MANGAS_BASE) 
                if os.path.isdir(os.path.join(MANGAS_BASE, d))]
    
    grupos = defaultdict(list)
    
    for carpeta in carpetas:
        normalizado = normalizar_nombre(carpeta)
        grupos[normalizado].append(carpeta)
    
    # Filtrar solo los que tienen duplicados
    duplicados = {k: v for k, v in grupos.items() if len(v) > 1}
    
    return duplicados

def elegir_nombre_canonico(nombres):
    """
    Elige el nombre "más completo" como canónico:
    - Prefiere el que tiene más caracteres
    - Prefiere el que tiene signos de exclamación/interrogación
    - Prefiere mayúsculas al inicio de palabras
    """
    # Ordenar por:
    # 1. Que tenga signos (!?)
    # 2. Más largo
    # 3. Que empiece con mayúscula
    def puntuacion(nombre):
        score = 0
        # Bonus por signos de puntuación
        if any(c in nombre for c in '¿?¡!'):
            score += 1000
        # Bonus por longitud
        score += len(nombre)
        # Bonus por mayúsculas al inicio de palabras
        if nombre[0].isupper():
            score += 100
        return score
    
    return max(nombres, key=puntuacion)

def unificar_carpeta(carpetas_duplicadas):
    """
    Unifica varias carpetas en una sola
    """
    # Elegir nombre canónico
    nombre_canonico = elegir_nombre_canonico(carpetas_duplicadas)
    ruta_canonica = os.path.join(MANGAS_BASE, nombre_canonico)
    
    print(f"\n📁 Unificando en: {nombre_canonico}")
    
    # Procesar cada carpeta duplicada
    for carpeta in carpetas_duplicadas:
        if carpeta == nombre_canonico:
            continue
            
        ruta_origen = os.path.join(MANGAS_BASE, carpeta)
        print(f"  ⬅️  Moviendo archivos desde: {carpeta}")
        
        # Mover todos los archivos
        archivos = os.listdir(ruta_origen)
        for archivo in archivos:
            origen = os.path.join(ruta_origen, archivo)
            destino = os.path.join(ruta_canonica, archivo)
            
            # Si el archivo ya existe en destino, renombrar
            if os.path.exists(destino):
                base, ext = os.path.splitext(archivo)
                contador = 1
                while os.path.exists(destino):
                    nuevo_nombre = f"{base} ({contador}){ext}"
                    destino = os.path.join(ruta_canonica, nuevo_nombre)
                    contador += 1
                print(f"    ⚠️  Renombrando duplicado: {archivo} -> {os.path.basename(destino)}")
            
            shutil.move(origen, destino)
            print(f"    ✅ {archivo}")
        
        # Eliminar carpeta vacía
        os.rmdir(ruta_origen)
        print(f"  🗑️  Carpeta eliminada: {carpeta}")

def main():
    print("=" * 80)
    print("🔧 UNIFICADOR DE CARPETAS DE MANGA")
    print("=" * 80)
    print(f"📂 Ruta base: {MANGAS_BASE}\n")
    
    # Encontrar duplicados
    duplicados = encontrar_duplicados()
    
    if not duplicados:
        print("✅ No se encontraron carpetas duplicadas")
        return
    
    print(f"🔍 Se encontraron {len(duplicados)} grupos de carpetas duplicadas:\n")
    
    # Mostrar resumen
    for i, (normalizado, carpetas) in enumerate(duplicados.items(), 1):
        canonico = elegir_nombre_canonico(carpetas)
        print(f"{i}. '{canonico}' (canónico)")
        for carpeta in carpetas:
            if carpeta != canonico:
                print(f"   └─ '{carpeta}' (se unificará)")
    
    # Confirmar
    print("\n" + "=" * 80)
    respuesta = input("¿Deseas unificar estas carpetas? (s/N): ").strip().lower()
    
    if respuesta != 's':
        print("❌ Operación cancelada")
        return
    
    print("\n" + "=" * 80)
    print("🚀 INICIANDO UNIFICACIÓN")
    print("=" * 80)
    
    # Unificar cada grupo
    total_unificadas = 0
    for carpetas in duplicados.values():
        unificar_carpeta(carpetas)
        total_unificadas += len(carpetas) - 1
    
    print("\n" + "=" * 80)
    print(f"✅ COMPLETADO")
    print(f"📊 {total_unificadas} carpetas unificadas en {len(duplicados)} grupos")
    print("=" * 80)

if __name__ == "__main__":
    main()
