# MAPA DE RENOMBRES (Termux → Linux)

Antes -> Después | Motivo | Impacto
---|---|---
`scripts/termux-keepalive.sh` -> `scripts/android/termux-keepalive.sh` | Archivado como contenido Android; evita confusión en raíz de scripts | Baja. Script sigue existiendo en nueva ubicación para usuarios Android
`start-optimized.sh` (comentarios 'Termux') -> `start-optimized.sh` (ajustado para detectar APP_DIR) | Eliminar ruta hardcodeada y comentarios confusos | Baja. Mejora portabilidad
`deploy/systemd/manga-library-app.service` (nuevo) -> N/A | Nuevo artefacto de despliegue para systemd | Medio. Permite arranque automático en Linux
`/home/dev/manga-library-app` (hardcode) -> `/srv/manga-library-app` (sugerido) | Rutas estándar en servidores Linux | Medio. Requiere ajuste al desplegar
