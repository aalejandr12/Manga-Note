// Script para poblar la base de datos con datos de ejemplo
// Uso: node scripts/seed.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const mangasEjemplo = [
  {
    titulo: "One Piece",
    tipo: "manga",
    estadoLectura: "leyendo",
    capituloActual: 1044,
    calificacion: 5,
    comentarioOpinion: "El mejor manga de aventuras. La construcción del mundo es increíble.",
    links: [
      {
        nombreFuente: "MangaPlus",
        url: "https://mangaplus.shueisha.co.jp/titles/100020",
        esPrincipal: true
      },
      {
        nombreFuente: "VIZ",
        url: "https://www.viz.com/shonenjump/chapters/one-piece",
        esPrincipal: false
      }
    ]
  },
  {
    titulo: "Fullmetal Alchemist",
    tipo: "manga",
    estadoLectura: "terminado",
    capituloActual: 108,
    calificacion: 5,
    comentarioOpinion: "Una obra maestra completa. Historia perfectamente cerrada.",
    links: [
      {
        nombreFuente: "VIZ",
        url: "https://www.viz.com/fullmetal-alchemist",
        esPrincipal: true
      }
    ]
  },
  {
    titulo: "Jujutsu Kaisen",
    tipo: "manga",
    estadoLectura: "leyendo",
    capituloActual: 258,
    calificacion: 4,
    comentarioOpinion: "Increíble sistema de poder y peleas. El arco de Shibuya fue épico.",
    links: [
      {
        nombreFuente: "MangaPlus",
        url: "https://mangaplus.shueisha.co.jp/titles/100034",
        esPrincipal: true
      }
    ]
  },
  {
    titulo: "Hunter x Hunter",
    tipo: "manga",
    estadoLectura: "en_pausa",
    capituloActual: 390,
    calificacion: 5,
    comentarioOpinion: "Increíble cuando sale. Los hiatos son difíciles de sobrellevar.",
    links: [
      {
        nombreFuente: "VIZ",
        url: "https://www.viz.com/hunter-x-hunter",
        esPrincipal: true
      }
    ]
  },
  {
    titulo: "Berserk",
    tipo: "manga",
    estadoLectura: "no_empezado",
    capituloActual: null,
    calificacion: null,
    comentarioOpinion: null,
    links: []
  },
  {
    titulo: "Chainsaw Man",
    tipo: "manga",
    estadoLectura: "leyendo",
    capituloActual: 150,
    calificacion: 4,
    comentarioOpinion: "Fresco y diferente. La parte 2 es interesante.",
    links: [
      {
        nombreFuente: "MangaPlus",
        url: "https://mangaplus.shueisha.co.jp/titles/100037",
        esPrincipal: true
      }
    ]
  },
  {
    titulo: "Solo Leveling",
    tipo: "manhwa",
    estadoLectura: "terminado",
    capituloActual: 179,
    calificacion: 4,
    comentarioOpinion: "Entretenido y con buen arte. Historia simple pero efectiva.",
    links: []
  },
  {
    titulo: "Tower of God",
    tipo: "manhwa",
    estadoLectura: "en_pausa",
    capituloActual: 550,
    calificacion: 3,
    comentarioOpinion: "Empezó muy bien pero se volvió muy complejo.",
    links: []
  }
];

async function seed() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  try {
    // Limpiar datos existentes (opcional - comentar si no quieres borrar)
    console.log('🗑️  Limpiando datos existentes...');
    await prisma.link.deleteMany();
    await prisma.manga.deleteMany();
    console.log('✅ Datos limpiados\n');

    // Crear mangas con sus links
    for (const mangaData of mangasEjemplo) {
      const { links, ...mangaFields } = mangaData;
      
      console.log(`📚 Creando: ${mangaFields.titulo}`);
      
      const manga = await prisma.manga.create({
        data: {
          ...mangaFields,
          links: {
            create: links
          }
        },
        include: {
          links: true
        }
      });
      
      console.log(`   ✅ Creado con ID: ${manga.id} (${manga.links.length} links)`);
    }

    console.log('\n✨ Seed completado exitosamente!');
    console.log(`📊 Total de mangas creados: ${mangasEjemplo.length}`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar seed
seed();
