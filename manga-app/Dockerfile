FROM node:18-alpine

# Instalar OpenSSL para Prisma y dcron para tareas programadas
RUN apk add --no-cache openssl dcron

WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Generar cliente de Prisma
RUN npx prisma generate

# Crear directorio de logs
RUN mkdir -p /var/log && touch /var/log/vigilancia-mangas.log

# Configurar cron job para vigilancia de mangas (cada hora en punto)
RUN echo "0 * * * * cd /usr/src/app && node scripts/vigilar-mangas.js >> /var/log/vigilancia-mangas.log 2>&1" > /etc/crontabs/root

# Exponer puerto
EXPOSE 3000

# Iniciar cron y la aplicación
CMD ["sh", "-c", "crond && npx prisma migrate deploy && npm start"]
