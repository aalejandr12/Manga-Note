const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// PUT /api/links/:id - Actualizar un link
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreFuente, url, esPrincipal } = req.body;
    
    // Verificar que el link existe
    const linkExistente = await prisma.link.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!linkExistente) {
      return res.status(404).json({ error: 'Link no encontrado' });
    }
    
    // Preparar datos para actualizar
    const dataToUpdate = {};
    
    if (nombreFuente !== undefined) {
      if (nombreFuente.trim() === '') {
        return res.status(400).json({ error: 'El nombre de la fuente no puede estar vacío' });
      }
      dataToUpdate.nombreFuente = nombreFuente.trim();
    }
    
    if (url !== undefined) {
      if (url.trim() === '') {
        return res.status(400).json({ error: 'La URL no puede estar vacía' });
      }
      dataToUpdate.url = url.trim();
    }
    
    if (esPrincipal !== undefined) {
      dataToUpdate.esPrincipal = esPrincipal;
    }
    
    const link = await prisma.link.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });
    
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar link', message: error.message });
  }
});

// DELETE /api/links/:id - Eliminar un link
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el link existe
    const link = await prisma.link.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!link) {
      return res.status(404).json({ error: 'Link no encontrado' });
    }
    
    await prisma.link.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Link eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar link', message: error.message });
  }
});

module.exports = router;
