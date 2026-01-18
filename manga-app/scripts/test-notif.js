#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simular() {
  const manga = await prisma.manga.findFirst({
    where: { titulo: 'The Titans Bride' },
    select: { id: true, capitulosDisponibles: true }
  });
  
  if (!manga) {
    console.log('❌ Manga no encontrado');
    return;
  }
  
  console.log('📖 The Titans Bride:');
  console.log('   ID:', manga.id);
  console.log('   Capítulos actuales:', manga.capitulosDisponibles);
  
  // Reducir a 163 para simular que salgan 2 nuevos
  await prisma.manga.update({
    where: { id: manga.id },
    data: { capitulosDisponibles: '163' }
  });
  
  console.log('✅ Simulación lista: actualizado a 163 capítulos');
  console.log('   Ejecuta: node scripts/vigilar-mangas.js');
  
  await prisma.$disconnect();
}

simular().catch(console.error);
