require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mangaRoutes = require('./routes/mangaRoutes');
const linkRoutes = require('./routes/linkRoutes');
const pushRoutes = require('./routes/pushRoutes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || '';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (frontend)
app.use(`${BASE_PATH}`, express.static(path.join(__dirname, '../public')));

// Servir imágenes de portadas
app.use(`${BASE_PATH}/covers`, express.static(path.join(__dirname, '../data/covers')));

// Rutas de API
app.use(`${BASE_PATH}/api/mangas`, mangaRoutes);
app.use(`${BASE_PATH}/api/links`, linkRoutes);
app.use(`${BASE_PATH}/api/push`, pushRoutes);
app.use(`${BASE_PATH}/api/files`, fileRoutes); // Nueva ruta para gestión de archivos

// Ruta raíz - servir index.html
app.get(`${BASE_PATH}/`, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Ruta sin BASE_PATH - redirigir a BASE_PATH
if (BASE_PATH) {
  app.get('/', (req, res) => {
    res.redirect(`${BASE_PATH}/`);
  });
}

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores general
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}${BASE_PATH}`);
  if (BASE_PATH) {
    console.log(`📁 Ruta base configurada: ${BASE_PATH}`);
  }
});
