# 🐛 Bug Fix: Script Tag Faltante en index.html

## Fecha: 2026-01-18

## 📋 Descripción del Bug

**Síntoma reportado:**
Al hacer scroll hasta el final de la página principal (`index.html`), se mostraba código JavaScript visible como texto plano en lugar de ejecutarse.

**Texto visible:**
```
// Determinar BASE_PATH dinámicamente por primer segmento (e.g., /upload) 
(function(){ 
  const seg = (window.location.pathname.split('/')[1] || ''); 
  window.BASE_PATH = seg && !seg.includes('.') ? `/${seg}` : ''; 
})();
```

## 🔍 Causa Raíz

En el archivo [`index.html:243-249`](file:///home/aledev/Escritorio/opt/MangaRead/manga-app/public/index.html#L243-L249), el código JavaScript para determinar el `BASE_PATH` estaba **fuera de una etiqueta `<script>`**.

**Código incorrecto (líneas 243-249):**
```html
</script>
    // Determinar BASE_PATH dinámicamente...
    (function(){
      const seg = (window.location.pathname.split('/')[1] || '');
      window.BASE_PATH = seg && !seg.includes('.') ? `/${seg}` : '';
    })();
</script>
<script src="js/index.js"></script>
```

**Problema:** 
- Línea 243: Cierra el script anterior ✅
- Líneas 244-248: **JavaScript SIN etiqueta de apertura `<script>`** ❌
- Línea 249: Intenta cerrar con `</script>` pero no hay apertura ❌

## ✅ Solución Aplicada

**Agregada etiqueta `<script>` de apertura en línea 244:**

```html
</script>
<script>  <!-- ✅ AGREGADO -->
    // Determinar BASE_PATH dinámicamente...
    (function(){
      const seg = (window.location.pathname.split('/')[1] || '');
      window.BASE_PATH = seg && !seg.includes('.') ? `/${seg}` : '';
    })();
</script>
<script src="js/index.js"></script>
```

## 📁 Archivos Modificados

- [`public/index.html`](file:///home/aledev/Escritorio/opt/MangaRead/manga-app/public/index.html) - Línea 244

## 🧪 Verificación

**Antes:**
- El código JavaScript era visible como texto al final de la página
- Hot-reload activo permitía ver el problema inmediatamente

**Después:**
- El código ya no es visible
- `BASE_PATH` se inicializa correctamente
- La aplicación funciona sin cambios visuales (el código siempre se ejecutó, pero también se mostraba)

**Cómo probar:**
1. Recargar la página (F5)
2. Hacer scroll hasta el final
3. Verificar que NO aparece código JavaScript visible

## 💡 Lecciones Aprendidas

1. **Validación HTML:** Este tipo de error puede detectarse con un linter HTML
2. **Hot-reload:** El hot-reload funcionó correctamente, el cambio se reflejó de inmediato
3. **Duplicación:** Existe código duplicado en `index.html`:
   - Línea 228: `const BASE_PATH = '/upload';` (hardcoded)
   - Líneas 244-248: Inicialización dinámica de BASE_PATH
   
   **Recomendación futura:** Eliminar la línea 228 y dejar solo la inicialización dinámica.

## 🔗 Relacionado

- Issue: Texto visible al final de la página principal
- Tipo: Bug de HTML/JavaScript
- Prioridad: Media (no afecta funcionalidad, solo estética)
- Complejidad: 2/10
