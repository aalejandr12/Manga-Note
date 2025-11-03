# 📖 Cómo Leer Mangas - Guía Rápida

## 🚀 Empezar desde Cero (Base de Datos Limpia)

Tu base de datos ha sido limpiada y está lista. Ahora:

---

## 📤 PASO 1: Subir tus PDFs

### Opción A: Desde Navegador Web

1. **Abre en tu navegador:**
   ```
   http://localhost:3000/upload
   ```
   
   O desde Tailscale (otro dispositivo):
   ```
   http://[TU-IP-TAILSCALE]:3000/upload
   ```

2. **Arrastra tus PDFs** a la zona de subida
   - O haz clic en "Buscar Archivos"
   - Puedes seleccionar múltiples a la vez

3. **Espera** mientras Gemini analiza cada PDF (5-10 segundos por archivo)

4. **Verás mensajes de éxito:**
   ```
   ✓ Given - Agregado a biblioteca
   ✓ Killing Stalking - Agregado a biblioteca
   ```

5. **Automáticamente** te redirigirá a la biblioteca

---

## 📚 PASO 2: Ver tu Biblioteca

1. **Abre la biblioteca:**
   ```
   http://localhost:3000
   ```

2. **Verás tus series organizadas:**
   ```
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │          │  │          │  │          │
   │  Given   │  │ Killing  │  │  Love    │
   │          │  │ Stalking │  │  Stage   │
   └──────────┘  └──────────┘  └──────────┘
   5 volúmenes   8 volúmenes   Completo
   ```

3. **Series con múltiples volúmenes** tendrán efecto de carpeta apilada
4. **Series únicas** se ven como un libro individual

---

## 📖 PASO 3: Abrir el Lector

### Si la serie tiene UN solo volumen:

```
1. Haz clic en la serie
   ↓
2. Se abre el lector directamente
   ↓
3. ¡Empieza a leer!
```

### Si la serie tiene MÚLTIPLES volúmenes:

```
1. Haz clic en la serie
   ↓
2. Se abre un modal con la lista de volúmenes:

   ┌───────────────────────────────────┐
   │ Given                         [X] │
   │ por Natsuki Kizu                  │
   │ [yaoi] [5 volúmenes]              │
   ├───────────────────────────────────┤
   │ 📄 Given - Vol. 1        ✓  [▶]  │
   │ 📄 Given - Vol. 2        ⏱  [▶]  │
   │ 📄 Given - Cap. 1-30     ○  [▶]  │
   │ 📄 Given - Vol. 4        ○  [▶]  │
   │ 📄 Given - Vol. 5        ○  [▶]  │
   └───────────────────────────────────┘

3. Haz clic en el volumen que quieras leer
   ↓
4. Se abre el lector
```

**Leyenda:**
- ✓ = Completado (verde)
- ⏱ = Leyendo (morado)
- ○ = Sin leer (gris)

---

## 🎮 PASO 4: Usar el Lector

### Controles del Lector:

```
┌────────────────────────────────────────┐
│ [←] Given - Vol. 1           Pág 5/120│
├────────────────────────────────────────┤
│                                        │
│                                        │
│         [PÁGINA DEL MANGA]             │
│                                        │
│                                        │
├────────────────────────────────────────┤
│ ◀ |===========●==========| ▶           │
│        Zoom: [−] 100% [+]              │
└────────────────────────────────────────┘
```

### Navegación:

- **Flechas del teclado** ← → : Cambiar página
- **Slider (barra)**: Ir a cualquier página
- **Botones ◀ ▶**: Página anterior/siguiente
- **Zoom [−] [+]**: Acercar/alejar
- **Touch/Swipe** (móvil): Deslizar para cambiar página

### Progreso Automático:

- ✅ El progreso se guarda automáticamente cada 3 segundos
- ✅ Si cierras y vuelves, continúa donde dejaste
- ✅ Al llegar al final, se marca como "Completado ✓"

---

## 🔍 Búsqueda y Filtros

### En la Biblioteca:

```
┌────────────────────────────────────────┐
│ 🔍 [Buscar...]                         │
│ [Todos] [Yaoi] [Manga] [Leyendo]      │
└────────────────────────────────────────┘
```

- **Barra de búsqueda**: Escribe el nombre de una serie
- **Filtros**:
  - `Todos`: Muestra todas las series
  - `Yaoi`: Solo series yaoi
  - `Manga`: Solo manga regular
  - `Leyendo`: Series que estás leyendo actualmente
  - `Completados`: Series que terminaste

---

## 📊 Estadísticas

En la parte superior de la biblioteca verás:

```
📚 15 Series    📖 48 Volúmenes
✓ 23 Completados  ⏱ 8 Leyendo
```

---

## 🎯 Ejemplo Completo

### Subir "Given (1-30).pdf":

1. Ve a `/upload`
2. Arrastra `Given (1-30).pdf`
3. Espera 5-10 segundos
4. Verás:
   ```
   ✓ Given - Agregado a biblioteca
   ```
5. Te redirige a biblioteca
6. Ves la serie "Given" con portada
7. Haz clic en la serie
8. Se abre modal con:
   - Portada de Given
   - Autor: Natsuki Kizu
   - Descripción
   - Volumen: "Given - Cap. 1-30"
9. Haz clic en el volumen
10. ¡Se abre el lector!

---

## 🔄 Continuar Leyendo

### Método 1: Desde la Biblioteca

1. Las series que estás leyendo tendrán:
   - Icono ⏱ (reloj)
   - Barra de progreso morada
2. Haz clic → Abre el modal
3. El volumen que estabas leyendo tendrá:
   - Barra de progreso con porcentaje
4. Haz clic → Continúa donde lo dejaste

### Método 2: Filtro "Leyendo"

1. En biblioteca, haz clic en `[Leyendo]`
2. Solo aparecen series en progreso
3. Haz clic en la que quieras continuar

---

## 🎨 Portadas

Las portadas se obtienen automáticamente:

1. **Primera subida**: Gemini busca portada en internet
2. **Si no encuentra**: Usa placeholder con color único
3. **El color** se genera del título (siempre igual para la misma serie)

---

## 📱 Desde Móvil/Tablet

### Mismo proceso:

1. Abre en navegador: `http://[IP-TAILSCALE]:3000`
2. Touch en cualquier serie
3. Touch en volumen
4. Usa gestos de swipe para pasar páginas
5. Pinch to zoom para acercar

---

## ⚠️ Solución de Problemas

### No veo ninguna serie:

```bash
# Verificar que el servidor esté corriendo
npm run status:bg

# Ver si hay series
curl http://localhost:3000/api/series
```

### El PDF no se sube:

1. Verifica el tamaño del archivo (sin límite, pero debe caber en tu almacenamiento)
2. Verifica que sea un archivo `.pdf`
3. Revisa los logs:
   ```bash
   tail -f logs/server.log
   ```

### El lector no carga:

1. Verifica que el archivo PDF exista:
   ```bash
   ls -lh uploads/*.pdf
   ```
2. Revisa la consola del navegador (F12)

---

## 🎉 ¡Listo para Empezar!

### Resumen Rápido:

```
1. /upload → Arrastra PDFs → Espera
2. / → Ve biblioteca → Haz clic en serie
3. Modal → Haz clic en volumen
4. ¡Lee! 📖
```

---

**Acceso rápido:**
- Subir: `http://localhost:3000/upload`
- Leer: `http://localhost:3000`
- Configuración: `http://localhost:3000/settings`
