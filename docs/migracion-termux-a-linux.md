# Migración Termux → Linux (resumen y pasos)

Este documento recoge las decisiones tomadas para migrar el proyecto desde Termux (Android) a un servidor Linux (Debian/Ubuntu). Contiene riesgos, pasos realizados y cómo revertir cambios.

Decisiones clave
- Desplegar en: /srv/manga-library-app
- Usuario de servicio: svc_manga
- Servicios: systemd (unidad en deploy/systemd/manga-library-app.service)
- Variables de entorno: /etc/manga-library-app/.env (ejemplo en `.env.example`)

Riesgos
- Dependencias nativas (sharp, libvips) requieren instalación de paquetes del sistema.
- Algunas funciones optimizadas para móvil (wake-lock) fueron archivadas y movidas a `scripts/android/`.

Pasos ejecutados
1. Detectar y listar referencias a termux*, rutas hardcodeadas y shebangs no portables.
2. Crear `deploy/systemd/manga-library-app.service` con User=svc_manga y EnvironmentFile.
3. Añadir `scripts/install_linux.sh` para instalación idempotente en Debian/Ubuntu.
4. Añadir `scripts/healthcheck.sh` para comprobaciones de humo.
5. Añadir `.env.example` y documentación.
6. Mover scripts Android/Termux a `scripts/android/` para archivado.

Reversión
- Cada cambio está en commits atómicos. Para revertir todo:
  - git revert <commit-hash> para cada commit aplicado.
  - Si ya copiaste el service a /etc/systemd/system, eliminarlo manualmente y recargar systemd.

Notas operativas
- Para instalar en un servidor limpio:
  sudo bash scripts/install_linux.sh
  editar /etc/manga-library-app/.env
  sudo cp deploy/systemd/manga-library-app.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now manga-library-app
  sudo systemctl status manga-library-app
