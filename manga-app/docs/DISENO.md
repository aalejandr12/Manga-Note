# 🎨 Diseño de la Aplicación

## 📱 Pantalla Principal (index.html)

```
┌─────────────────────────────────────────┐
│  🔍 My Mangas              🔍  ⚙️        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌─────────┐              │
│  │ Portada │  │ Portada │              │
│  │         │  │         │              │
│  │ Badge   │  │ Badge   │              │
│  │ One     │  │ FMA     │              │
│  │ Piece   │  │         │              │
│  │ Cap.1044│  │ ⭐️Love │              │
│  └─────────┘  └─────────┘              │
│                                         │
│  ┌─────────┐  ┌─────────┐              │
│  │ Portada │  │ Portada │              │
│  │         │  │         │              │
│  │ Badge   │  │ Badge   │              │
│  │ Jujutsu │  │ Hunter  │              │
│  │ Kaisen  │  │ x Hunter│              │
│  │ Cap.258 │  │ Cap.390 │              │
│  └─────────┘  └─────────┘              │
│                                         │
│                  ( + )                  │ ← Botón flotante
└─────────────────────────────────────────┘
```

**Características:**
- Grid 2 columnas
- Tarjetas con portada de fondo
- Badge de estado (color según estado)
- Hover: sombra y escala
- Click: navega a detalle

---

## 📖 Pantalla de Detalle (detalle.html)

```
┌─────────────────────────────────────────┐
│  ← Fondo borroso de portada        🗑️   │
│                                         │
│         ┌─────────────┐                 │
│         │             │                 │
│         │   Portada   │                 │
│         │   Grande    │                 │
│         │             │                 │
│         └─────────────┘                 │
│                                         │
│        Jujutsu Kaisen                   │
│     [Leyendo] [Cap. 258]                │
│                                         │
├─────────────────────────────────────────┤
│  Enlaces de lectura:                    │
│  ┌─────────────────────────────────┐   │
│  │ MangaPlus          [Abrir ↗️]   │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ VIZ                [Abrir ↗️]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Mi opinión:                            │
│  ⭐⭐⭐⭐⭐                                │
│  "Increíble sistema de poder..."        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     ✏️  Editar Manga             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Características:**
- Fondo borroso con portada
- Portada grande centrada
- Enlaces clickeables
- Calificación con estrellas
- Botón editar sticky
- Botón eliminar en header

---

## ➕ Pantalla Agregar/Editar (agregar.html)

```
┌─────────────────────────────────────────┐
│  📊 Agregar Manga                   ✕   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     📷                          │   │
│  │   Subir portada                 │   │
│  │   PNG, JPG, WEBP                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Título *                               │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Tipo                                   │
│  ┌─────────────────────────────────┐   │
│  │ [Manga ▼]                       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Estado                                 │
│  ┌─────────────────────────────────┐   │
│  │[No empezado][Leyendo][Terminado]│   │
│  │              [En pausa]          │   │
│  └─────────────────────────────────┘   │
│    ↑ Selector animado con pill          │
│                                         │
│  Capítulo actual                        │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Enlaces para leer:                     │
│  ┌───────┬─────────────────┬─────┐     │
│  │Nombre │ URL             │  🗑️ │     │
│  └───────┴─────────────────┴─────┘     │
│  [+ Agregar link]                       │
│                                         │
│  Mi calificación                        │
│  ☆☆☆☆☆  ← Click en estrellas           │
│                                         │
│  Comentario personal                    │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     ✓  Guardar                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Características:**
- Dropzone para portada con preview
- Selector de estado animado
- Links dinámicos (agregar/eliminar)
- Estrellas interactivas
- Validaciones en tiempo real
- Funciona para crear y editar

---

## 🎨 Paleta de Colores

### Tema Oscuro (por defecto)

| Elemento | Color |
|----------|-------|
| Fondo | `#0B101B` (pantalla principal) |
| Fondo | `#0D1117` (detalle) |
| Fondo | `#0f172a` (formulario) |
| Texto | `#E5E7EB` |
| Primario | `#007BFF` (principal) |
| Primario | `#4F46E5` (detalle) |
| Primario | `#4ade80` (formulario) |
| Cards | `#1e293b` |

### Estados de Lectura

| Estado | Color |
|--------|-------|
| Leyendo | Azul `#3B82F6` |
| Terminado | Verde `#10B981` |
| En pausa | Naranja `#F59E0B` |
| No empezado | Gris `#6B7280` |

---

## 🎭 Interacciones

### Hover Effects
- ✨ Tarjetas: Sombra más grande + scale(1.05)
- 🔘 Botones: Cambio de color + scale(1.05)
- 🖼️ Portadas: scale(1.05) dentro del contenedor

### Transitions
- ⏱️ Duración: 300ms
- 📈 Easing: cubic-bezier(0.4, 0, 0.2, 1)

### Animaciones
- 🔄 Estado selector: Pill deslizante
- ⭐ Estrellas: Hover preview de calificación
- 📸 Portada: Preview al subir archivo

---

## 📱 Responsive Design

### Breakpoints

| Tamaño | Ajustes |
|--------|---------|
| Mobile | Grid 2 columnas |
| Tablet | Grid 2-3 columnas |
| Desktop | Max-width contenedor |

### Mobile-First
- 📱 Diseñado primero para móvil
- 💻 Se adapta a pantallas grandes
- 👆 Touch-friendly (botones grandes)

---

## 🎯 UX Features

### Feedback Visual
- ✅ Estados claros con colores
- 🎨 Badges informativos
- 💬 Mensajes de confirmación
- ⚠️ Validaciones en tiempo real

### Navegación
- 🔙 Botón atrás siempre visible
- 🏠 Logo clickeable vuelve a home
- ➡️ Flujo claro: Lista → Detalle → Editar

### Accesibilidad
- 🎨 Alto contraste en modo oscuro
- 📝 Labels descriptivos
- ⌨️ Navegable por teclado
- 🖱️ Cursores contextuales

---

## 🖼️ Iconografía

### Material Symbols Outlined

| Icono | Uso |
|-------|-----|
| `add` | Agregar manga |
| `edit` | Editar manga |
| `delete` | Eliminar manga |
| `arrow_back` | Volver |
| `search` | Buscar |
| `tune` | Filtros |
| `star` | Calificación |
| `favorite` | Me encanta |
| `open_in_new` | Abrir enlace |
| `add_photo_alternate` | Subir imagen |
| `add_circle` | Agregar link |

---

## 🌟 Highlights de Diseño

1. **Inmersivo**: Fondo borroso con portada en detalle
2. **Moderno**: Glassmorphism (backdrop-blur)
3. **Smooth**: Animaciones fluidas
4. **Clean**: Espacios respirables
5. **Consistente**: Mismo lenguaje visual
6. **Intuitivo**: Acciones claras

---

**El diseño está adaptado de los 3 HTML originales, manteniendo su estética mientras se integra con la funcionalidad completa de la API.** 🎨✨
