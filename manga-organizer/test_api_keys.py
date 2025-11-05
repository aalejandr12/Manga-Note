#!/usr/bin/env python3
"""
Script de prueba para verificar las API keys de Google Gemini
"""
import google.generativeai as genai
import config
import time

def test_api_key(api_key, key_number):
    """Prueba una API key específica"""
    try:
        print(f"\n{'='*60}")
        print(f"Probando API Key #{key_number}")
        print(f"Key: {api_key[:20]}...")
        print(f"{'='*60}")
        
        # Configurar Gemini
        genai.configure(api_key=api_key)
        
        # Listar modelos disponibles
        print("\n📋 Modelos disponibles:")
        models = genai.list_models()
        for model in models:
            if 'generateContent' in model.supported_generation_methods:
                print(f"  ✓ {model.name}")
        
        # Hacer una prueba simple
        print("\n🧪 Prueba de generación de contenido...")
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        response = model.generate_content("Di solo: 'Funciona correctamente'")
        print(f"  Respuesta: {response.text}")
        
        print(f"\n✅ API Key #{key_number} funciona correctamente!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error con API Key #{key_number}: {str(e)}")
        return False

def main():
    """Función principal"""
    print("🔍 Verificando configuración de API Keys de Google Gemini\n")
    
    if not config.GOOGLE_API_KEYS:
        print("❌ No se encontraron API keys en la configuración")
        return
    
    print(f"📊 Total de API Keys configuradas: {len(config.GOOGLE_API_KEYS)}")
    print(f"🤖 Modelo configurado: {config.GEMINI_MODEL}")
    print(f"⏱️  Delay entre solicitudes: {config.REQUEST_DELAY}s")
    
    working_keys = 0
    failed_keys = 0
    
    for i, api_key in enumerate(config.GOOGLE_API_KEYS, 1):
        if test_api_key(api_key, i):
            working_keys += 1
        else:
            failed_keys += 1
        
        # Pequeña pausa entre pruebas
        if i < len(config.GOOGLE_API_KEYS):
            time.sleep(2)
    
    # Resumen final
    print(f"\n{'='*60}")
    print(f"📊 RESUMEN DE PRUEBAS")
    print(f"{'='*60}")
    print(f"✅ API Keys funcionando: {working_keys}/{len(config.GOOGLE_API_KEYS)}")
    print(f"❌ API Keys con error: {failed_keys}/{len(config.GOOGLE_API_KEYS)}")
    
    if working_keys > 0:
        print(f"\n🎉 ¡Listo! Puedes usar el sistema con {working_keys} API key(s)")
    else:
        print(f"\n⚠️  Ninguna API key funcionó. Verifica tu configuración.")

if __name__ == "__main__":
    main()
