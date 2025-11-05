"""
Servidor Flask para la aplicación Manga Organizer
"""
from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
from werkzeug.utils import secure_filename
import os
from pathlib import Path
import config
import gemini_organizer

app = Flask(__name__)
app.secret_key = 'manga_organizer_secret_key_2024'
app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
# Sin límite de tamaño si MAX_FILE_SIZE_MB es None
if config.MAX_FILE_SIZE_MB:
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_FILE_SIZE_MB * 1024 * 1024  # Convertir a bytes
else:
    app.config['MAX_CONTENT_LENGTH'] = None  # Sin límite

# Crear carpetas necesarias
os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(config.MANGA_DESTINATION, exist_ok=True)


def archivo_permitido(filename):
    """Verifica si la extensión del archivo está permitida"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Página principal con el formulario de subida"""
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    """Maneja la subida de archivos PDF"""
    
    print("\n" + "="*80)
    print("🚀 NUEVA SOLICITUD DE SUBIDA DE ARCHIVOS")
    print("="*80)
    
    # Verificar si se enviaron archivos
    if 'files[]' not in request.files:
        print("❌ Error: No se enviaron archivos")
        return jsonify({'success': False, 'error': 'No se enviaron archivos'}), 400
    
    files = request.files.getlist('files[]')
    
    if not files or files[0].filename == '':
        print("❌ Error: No se seleccionaron archivos")
        return jsonify({'success': False, 'error': 'No se seleccionaron archivos'}), 400
    
    print(f"📦 Total de archivos recibidos: {len(files)}")
    
    resultados = []
    archivos_guardados = []
    
    # Guardar todos los archivos primero
    print("\n📥 Guardando archivos...")
    for i, file in enumerate(files, 1):
        if file and archivo_permitido(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            print(f"  [{i}/{len(files)}] Guardando: {filename}")
            file.save(filepath)
            archivos_guardados.append(filepath)
            print(f"  ✅ Guardado correctamente")
        else:
            print(f"  ❌ Archivo rechazado: {file.filename if file else 'desconocido'}")
            resultados.append({
                'success': False,
                'original_name': file.filename if file else 'desconocido',
                'error': 'Tipo de archivo no permitido (solo PDF)'
            })
    
    # Procesar todos los archivos con Gemini
    if archivos_guardados:
        print(f"\n🤖 Procesando {len(archivos_guardados)} archivo(s) con Gemini...")
        print("-"*80)
        resultados_procesamiento = gemini_organizer.procesar_multiples_archivos(
            archivos_guardados,
            config.MANGA_DESTINATION
        )
        resultados.extend(resultados_procesamiento)
        print("-"*80)
    
    # Contar éxitos y fallos
    exitosos = sum(1 for r in resultados if r.get('success'))
    fallidos = len(resultados) - exitosos
    
    return jsonify({
        'success': True,
        'total': len(resultados),
        'exitosos': exitosos,
        'fallidos': fallidos,
        'resultados': resultados
    })


@app.route('/status')
def status():
    """Endpoint para verificar el estado del servidor"""
    return jsonify({
        'status': 'online',
        'upload_folder': config.UPLOAD_FOLDER,
        'destination': config.MANGA_DESTINATION,
        'gemini_model': config.GEMINI_MODEL
    })


@app.route('/folders')
def list_folders():
    """Lista las carpetas de manga organizadas"""
    try:
        carpetas = []
        if os.path.exists(config.MANGA_DESTINATION):
            for item in os.listdir(config.MANGA_DESTINATION):
                item_path = os.path.join(config.MANGA_DESTINATION, item)
                if os.path.isdir(item_path):
                    # Contar archivos PDF en la carpeta
                    num_archivos = len([f for f in os.listdir(item_path) if f.endswith('.pdf')])
                    carpetas.append({
                        'nombre': item,
                        'archivos': num_archivos
                    })
        
        carpetas.sort(key=lambda x: x['nombre'])
        
        return jsonify({
            'success': True,
            'total': len(carpetas),
            'carpetas': carpetas
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print(f"🚀 Iniciando Manga Organizer Server...")
    print(f"📁 Carpeta de subida: {config.UPLOAD_FOLDER}")
    print(f"📚 Carpeta de destino: {config.MANGA_DESTINATION}")
    print(f"🤖 Modelo Gemini: {config.GEMINI_MODEL}")
    print(f"🌐 Servidor corriendo en http://0.0.0.0:{config.PORT}")
    
    app.run(host='0.0.0.0', port=config.PORT, debug=True)
