# 🚀 Inicio Rápido

## Levantar la aplicación

```bash
docker-compose up --build
```

O usa el script:

```bash
chmod +x start.sh
./start.sh
```

## Acceder

```
http://localhost:3000
```

## Detener

```bash
docker-compose down
```

## Ver logs

```bash
docker-compose logs -f app
docker-compose logs -f db
```

## Comandos útiles

### Reiniciar contenedores
```bash
docker-compose restart
```

### Ver estado
```bash
docker-compose ps
```

### Acceder al contenedor de la app
```bash
docker exec -it manga_app sh
```

### Acceder a PostgreSQL
```bash
docker exec -it manga_db psql -U manga_user manga_db
```

### Prisma Studio (GUI para ver la base de datos)
```bash
docker exec -it manga_app npx prisma studio
```
Luego abre: http://localhost:5555

### Backup de datos
```bash
# Base de datos
docker exec manga_db pg_dump -U manga_user manga_db > backup.sql

# Portadas
cp -r data/covers backup_covers/
```

---

Para más información, consulta el [README.md](README.md) completo.
