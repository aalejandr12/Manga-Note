# LISTA DE ELIMINACIONES (propuesta)

EN PROYECTO: no se eliminaron archivos automáticamente sin verificación; en su lugar se archivaron/movieron cuando era apropiado.

Propuestas con evidencia (buscar referencias antes de eliminar):

- `scripts/termux-keepalive.sh` — movido a `scripts/android/termux-keepalive.sh`.
  Evidencia: varias referencias en docs y scripts. Se archiva en carpeta `android` para mantener compatibilidad histórica.

- Comentarios y advertencias en `start.sh`, `README` y documentación que mencionan Termux — actualizados parcialmente en `README_LINUX.md` y `docs/migracion-termux-a-linux.md`.

Acción recomendada para eliminación final:
1. Ejecutar herramientas estáticas para detectar referencias: `rg "termux" || true`.
2. Revisar manualmente las referencias encontradas en docs; si corresponden a Android, mantener en `docs/android.md` o `scripts/android/`.
3. Remover archivos solo tras aprobaciones de PR y verificación en CI (smoke tests).
