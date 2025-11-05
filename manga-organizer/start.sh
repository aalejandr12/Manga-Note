#!/bin/bash

# Script para iniciar el servidor Manga Organizer

cd /opt/MangaRead/manga-organizer

# Activar el entorno virtual
source venv/bin/activate

# Iniciar el servidor
python app.py
