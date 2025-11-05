"""
Configuración de la aplicación Manga Organizer
"""
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

# Ruta base del proyecto
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Carpeta donde se subirán los PDFs temporalmente
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

# Carpeta destino donde se organizarán los mangas (la carpeta Mangas principal)
MANGA_DESTINATION = '/opt/MangaRead/Mangas'

# Múltiples API Keys de Google Gemini para rotación
GOOGLE_API_KEYS = [
    os.environ.get('GOOGLE_API_KEY_1'),
    os.environ.get('GOOGLE_API_KEY_2'),
    os.environ.get('GOOGLE_API_KEY_3'),
    os.environ.get('GOOGLE_API_KEY_4'),
    os.environ.get('GOOGLE_API_KEY_5'),
    os.environ.get('GOOGLE_API_KEY_6'),
    os.environ.get('GOOGLE_API_KEY_7'),
    os.environ.get('GOOGLE_API_KEY_8'),
    os.environ.get('GOOGLE_API_KEY_9'),
    os.environ.get('GOOGLE_API_KEY_10'),
]
# Filtrar las que no sean None
GOOGLE_API_KEYS = [key for key in GOOGLE_API_KEYS if key]

# Modelo de Gemini a usar (gemini-2.5-pro es más preciso)
GEMINI_MODEL = 'gemini-2.5-pro'

# Tiempo de espera entre solicitudes (en segundos) para evitar límites de tasa
REQUEST_DELAY = 2  # 2 segundos entre cada solicitud (si hay error 429, esperará 60s automáticamente)

# Extensiones permitidas
ALLOWED_EXTENSIONS = {'pdf'}

# Puerto del servidor
PORT = 5000

# Tamaño máximo de archivo (en MB) - None = sin límite
MAX_FILE_SIZE_MB = None  # Sin límite para archivos de manga grandes
