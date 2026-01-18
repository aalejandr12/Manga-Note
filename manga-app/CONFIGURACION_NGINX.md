# Configuración de NGINX para komga.aaleddy.app/upload/

Esta guía te ayudará a exponer la aplicación manga en el dominio `komga.aaleddy.app/upload/` usando NGINX como proxy inverso.

## Requisitos Previos

- NGINX instalado en tu servidor
- Certificado SSL configurado para el dominio `aaleddy.app`
- La aplicación manga corriendo en `http://localhost:3000/upload/`

## Paso 1: Instalar NGINX (si no lo tienes)

```bash
sudo apt update
sudo apt install nginx -y
```

## Paso 2: Crear la Configuración de NGINX

Crea o edita el archivo de configuración del sitio:

```bash
sudo nano /etc/nginx/sites-available/komga.aaleddy.app
```

Agrega la siguiente configuración:

```nginx
server {
    listen 80;
    server_name komga.aaleddy.app;

    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name komga.aaleddy.app;

    # Configuración SSL (ajusta las rutas según tu certificado)
    ssl_certificate /etc/letsencrypt/live/aaleddy.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aaleddy.app/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Logs
    access_log /var/log/nginx/komga.aaleddy.app.access.log;
    error_log /var/log/nginx/komga.aaleddy.app.error.log;

    # Cliente puede subir archivos grandes (portadas)
    client_max_body_size 50M;

    # Ruta principal - puede ser otra aplicación (Komga original)
    location / {
        # Si tienes Komga en otro puerto, descomenta y configura:
        # proxy_pass http://localhost:8080;
        # proxy_set_header Host $host;
        # proxy_set_header X-Real-IP $remote_addr;
        # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # proxy_set_header X-Forwarded-Proto $scheme;
        
        # O si no tienes nada, puedes redirigir a /upload/
        return 301 https://$server_name/upload/;
    }

    # Aplicación Manga en /upload/
    location /upload/ {
        proxy_pass http://localhost:3000/upload/;
        proxy_http_version 1.1;
        
        # Headers importantes
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Para WebSockets (si los usas en el futuro)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # (Opcional) Redirigir rutas antiguas
    location /MyLibreria/ {
        return 301 https://$server_name/upload/;
    }
}
```

## Paso 3: Habilitar el Sitio

```bash
# Crear enlace simbólico a sites-enabled
sudo ln -s /etc/nginx/sites-available/komga.aaleddy.app /etc/nginx/sites-enabled/

# Verificar la configuración
sudo nginx -t

# Si todo está OK, reiniciar NGINX
sudo systemctl restart nginx
```

## Paso 4: Configurar el Firewall (si es necesario)

```bash
# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Paso 5: Configurar SSL con Certbot (si no lo tienes)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado (si no lo tienes)
sudo certbot --nginx -d komga.aaleddy.app

# Certbot configurará automáticamente SSL en tu configuración de NGINX
```

## Verificación

1. Abre tu navegador y visita: `https://komga.aaleddy.app/upload/`
2. Deberías ver tu aplicación de mangas funcionando correctamente
3. Los filtros y todas las funcionalidades deberían trabajar normalmente

## Troubleshooting

### Error 502 Bad Gateway
- Verifica que el contenedor de Docker está corriendo: `sudo docker ps`
- Revisa los logs del contenedor: `sudo docker logs manga_app`
- Verifica que el puerto 3000 está accesible desde el host

### Error 404
- Verifica que BASE_PATH está configurado correctamente en Docker Compose o variables de entorno
- Revisa la configuración de NGINX: `sudo nginx -t`
- Verifica los logs de NGINX: `sudo tail -f /var/log/nginx/komga.aaleddy.app.error.log`

### Las portadas no cargan
- Verifica que el volumen de portadas está montado correctamente en docker-compose.yml
- Asegúrate de que NGINX tiene permisos para leer los archivos

## Configuración Alternativa: Sin SSL (solo para desarrollo)

Si estás probando localmente sin SSL:

```nginx
server {
    listen 80;
    server_name komga.aaleddy.app;

    client_max_body_size 50M;

    location /upload/ {
        proxy_pass http://localhost:3000/upload/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Notas Adicionales

- La aplicación está configurada para funcionar en una subruta como `/upload/` o en la raíz `/`
- Si cambias el BASE_PATH, debes actualizar tanto Docker Compose/variables como la configuración de NGINX
- Todos los assets (CSS, JS, imágenes) se sirven correctamente con rutas relativas
- Los filtros por estado (Leyendo, Terminado, etc.) funcionan correctamente

## Mantenimiento

Para actualizar la aplicación:

```bash
cd /opt/MangaRead/manga-app
sudo docker-compose down
sudo docker-compose up --build -d
```

Para ver los logs:

```bash
# Logs de la aplicación
sudo docker logs -f manga_app

# Logs de NGINX
sudo tail -f /var/log/nginx/komga.aaleddy.app.access.log
```
