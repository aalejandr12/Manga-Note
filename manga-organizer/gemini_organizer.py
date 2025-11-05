"""
Módulo de integración con Google Gemini para análisis y organización de mangas
"""
import os
import json
import time
import google.generativeai as genai
from typing import Dict, Optional
import config

# Índice para rotación de API keys
current_key_index = 0

def get_next_api_key():
    """Obtiene la siguiente API key en rotación"""
    global current_key_index
    if not config.GOOGLE_API_KEYS:
        raise ValueError("No hay API keys configuradas")
    
    key = config.GOOGLE_API_KEYS[current_key_index]
    current_key_index = (current_key_index + 1) % len(config.GOOGLE_API_KEYS)
    return key

def configure_gemini():
    """Configura Gemini con la siguiente API key disponible"""
    api_key = get_next_api_key()
    genai.configure(api_key=api_key)
    return api_key

# Esquema JSON para la respuesta estructurada
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "nombre_carpeta_estandarizado": {
            "type": "string",
            "description": "El nombre de la serie principal, estandarizado y limpio. Ignora subtítulos, autores, o palabras como 'Capítulo' para facilitar la agrupación. Por ejemplo, si el título es 'Off Track Crush 1-6 extra', el estandarizado debe ser 'Off Track Crush'."
        },
        "titulo_limpio_archivo": {
            "type": "string",
            "description": "El título completo de este archivo, limpiado de números de capítulo o palabras extra. Este se usará para el nuevo nombre del archivo, seguido del número de capítulo."
        },
        "capitulo_o_rango": {
            "type": "string",
            "description": "El número de capítulo o rango de capítulos (ej. '1', '1-5', '18-20', '32'). Si no se encuentra un número, devuelve 'ONE_SHOT' o 'DESCONOCIDO'."
        },
        "es_secuela_o_extra": {
            "type": "boolean",
            "description": "Verdadero si el archivo parece ser una secuela, un capítulo extra, o un 'spin-off' de la serie principal."
        }
    },
    "required": ["nombre_carpeta_estandarizado", "titulo_limpio_archivo", "capitulo_o_rango", "es_secuela_o_extra"]
}

PROMPT_TEMPLATE = """Eres un experto organizador de bibliotecas de cómics. Analiza el siguiente nombre de archivo de manga o manhwa. Tu objetivo es normalizar el título para una organización perfecta.

Nombre de Carpeta Estandarizado: Extrae el título principal y estandarízalo para agrupar series similares (ej. 'Wolf Teacher & Tiger Daddy' debe ser el estándar para 'Mairirn Wolf Teacher & Tiger Daddy...'). Elimina todos los números de capítulo, rangos y palabras de archivo (ej. '.pdf').

Título Limpio de Archivo: El título exacto de la obra tal como se presenta, pero sin los números de capítulo.

Capítulo o Rango: Identifica con precisión el capítulo o rango de capítulos.

Nombre de archivo a analizar: {filename}"""


def analizar_nombre_manga(filename: str, max_retries: int = 3) -> Optional[Dict]:
    """
    Analiza el nombre de un archivo de manga usando Gemini API con rotación de keys
    
    Args:
        filename: Nombre del archivo PDF a analizar
        max_retries: Número máximo de intentos con diferentes API keys
        
    Returns:
        Diccionario con los metadatos extraídos o None si hay error
    """
    for attempt in range(max_retries):
        try:
            # Configurar Gemini con la siguiente API key
            current_key = configure_gemini()
            print(f"[Intento {attempt + 1}/{max_retries}] Usando API key #{(current_key_index - 1) % len(config.GOOGLE_API_KEYS) + 1}")
            
            # Configurar el modelo
            model = genai.GenerativeModel(
                model_name=config.GEMINI_MODEL,
                generation_config={
                    "temperature": 0.1,  # Baja temperatura para respuestas más consistentes
                }
            )
            
            # Crear el prompt con el nombre del archivo y especificar formato JSON
            prompt = PROMPT_TEMPLATE.format(filename=filename)
            prompt += "\n\nResponde ÚNICAMENTE con un objeto JSON válido que siga exactamente este esquema, sin texto adicional ni markdown:\n"
            prompt += json.dumps(RESPONSE_SCHEMA, indent=2)
            
            # Generar la respuesta
            response = model.generate_content(prompt)
            
            # Limpiar la respuesta de posibles marcadores de código
            response_text = response.text.strip()
            
            # Eliminar bloques de código markdown si existen
            if response_text.startswith("```"):
                # Buscar el contenido entre ``` y ```
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
            
            # Eliminar cualquier texto antes del primer {
            json_start = response_text.find('{')
            if json_start > 0:
                response_text = response_text[json_start:]
            
            # Eliminar cualquier texto después del último }
            json_end = response_text.rfind('}')
            if json_end > 0:
                response_text = response_text[:json_end + 1]
            
            print(f"Respuesta de Gemini: {response_text[:200]}...")
            
            # Parsear la respuesta JSON
            result = json.loads(response_text)
            
            # Validar que tenga los campos requeridos
            required_fields = ["nombre_carpeta_estandarizado", "titulo_limpio_archivo", "capitulo_o_rango", "es_secuela_o_extra"]
            if not all(field in result for field in required_fields):
                raise ValueError(f"Respuesta JSON incompleta. Campos requeridos: {required_fields}")
            
            # Esperar un poco para no saturar la API
            time.sleep(config.REQUEST_DELAY)
            
            return result
            
        except json.JSONDecodeError as e:
            error_msg = f"Error al parsear JSON: {str(e)}"
            print(f"Error en intento {attempt + 1} al analizar '{filename}': {error_msg}")
            if attempt < max_retries - 1:
                print(f"Reintentando con otra API key...")
                time.sleep(2)
                continue
            
        except Exception as e:
            error_msg = str(e)
            print(f"Error en intento {attempt + 1} al analizar '{filename}': {error_msg}")
            
            # Si es error de límite de tasa o quota, esperar 1 minuto y reintentar
            if "429" in error_msg or "quota" in error_msg.lower() or "rate" in error_msg.lower() or "resource exhausted" in error_msg.lower():
                if attempt < max_retries - 1:
                    print(f"⏳ Límite de API alcanzado. Esperando 60 segundos antes de reintentar...")
                    time.sleep(60)  # Esperar 1 minuto
                    print(f"🔄 Reintentando con la siguiente API key...")
                    continue
            else:
                # Si es otro tipo de error, no reintentar
                break
    
    print(f"No se pudo analizar '{filename}' después de {max_retries} intentos")
    return None


def organizar_manga(pdf_path: str, destino_base: str) -> Dict:
    """
    Organiza un archivo PDF de manga en la estructura de carpetas correcta
    
    Args:
        pdf_path: Ruta completa al archivo PDF
        destino_base: Carpeta base donde se organizarán los mangas
        
    Returns:
        Diccionario con información del resultado
    """
    filename = os.path.basename(pdf_path)
    
    print(f"\n📄 Procesando: {filename}")
    
    # Analizar el nombre del archivo con Gemini
    print(f"  🔍 Analizando con Gemini...")
    metadatos = analizar_nombre_manga(filename)
    
    if not metadatos:
        print(f"  ❌ Error: No se pudieron extraer metadatos")
        return {
            "success": False,
            "error": "No se pudieron extraer metadatos del archivo",
            "original_name": filename
        }
    
    try:
        print(f"  📊 Metadatos extraídos:")
        print(f"     - Serie: {metadatos['nombre_carpeta_estandarizado']}")
        print(f"     - Capítulo: {metadatos['capitulo_o_rango']}")
        
        # Crear la carpeta de la serie si no existe
        carpeta_serie = os.path.join(destino_base, metadatos['nombre_carpeta_estandarizado'])
        os.makedirs(carpeta_serie, exist_ok=True)
        print(f"  📁 Carpeta: {carpeta_serie}")
        
        # Construir el nuevo nombre del archivo
        nuevo_nombre = f"{metadatos['titulo_limpio_archivo']} - Cap. {metadatos['capitulo_o_rango']}.pdf"
        print(f"  📝 Nuevo nombre: {nuevo_nombre}")
        
        # Ruta completa del destino
        destino_completo = os.path.join(carpeta_serie, nuevo_nombre)
        
        # Mover y renombrar el archivo
        print(f"  🚚 Moviendo archivo...")
        os.rename(pdf_path, destino_completo)
        print(f"  ✅ Archivo organizado correctamente!")
        
        return {
            "success": True,
            "original_name": filename,
            "new_name": nuevo_nombre,
            "folder": metadatos['nombre_carpeta_estandarizado'],
            "chapter": metadatos['capitulo_o_rango'],
            "is_extra": metadatos['es_secuela_o_extra'],
            "full_path": destino_completo
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "original_name": filename,
            "metadatos": metadatos
        }


def procesar_multiples_archivos(archivos_pdf: list, destino_base: str) -> list:
    """
    Procesa múltiples archivos PDF
    
    Args:
        archivos_pdf: Lista de rutas a archivos PDF
        destino_base: Carpeta base donde se organizarán
        
    Returns:
        Lista con los resultados de cada archivo
    """
    resultados = []
    total = len(archivos_pdf)
    
    print(f"\n{'='*80}")
    print(f"📚 PROCESANDO {total} ARCHIVO(S)")
    print(f"{'='*80}")
    
    for i, pdf_path in enumerate(archivos_pdf, 1):
        print(f"\n[{i}/{total}] ⚙️  Procesando archivo {i} de {total}...")
        resultado = organizar_manga(pdf_path, destino_base)
        resultados.append(resultado)
        
        if resultado['success']:
            print(f"[{i}/{total}] ✅ Completado exitosamente")
        else:
            print(f"[{i}/{total}] ❌ Error: {resultado.get('error', 'Error desconocido')}")
    
    exitosos = sum(1 for r in resultados if r.get('success'))
    fallidos = total - exitosos
    
    print(f"\n{'='*80}")
    print(f"📊 RESUMEN FINAL")
    print(f"{'='*80}")
    print(f"✅ Exitosos: {exitosos}/{total}")
    print(f"❌ Fallidos: {fallidos}/{total}")
    print(f"{'='*80}\n")
    
    return resultados
