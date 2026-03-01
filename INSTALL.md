# OmniSentinel — Instalación Local

## Requisitos

- Docker Desktop instalado y en ejecución
- Node.js 18+ (para desarrollo local) O un VPS con dominio público
- Cuenta OpenAI con API key (para mem0 memory + Whisper voice)
- Cuenta Anthropic con API key (para los agentes OmniSentinel)

## Paso 1 — Variables de entorno

```bash
cp .env.docker.example .env.docker
cp .env.local.example .env.local
```

Llenar ambos archivos con las API keys proporcionadas.

## Paso 2 — Iniciar servicios de memoria

```bash
docker-compose --env-file .env.docker up -d
```

Esto inicia: mem0 (puerto 8000), Neo4j (puerto 7687), PostgreSQL (puerto 5433).

Esperar ~60 segundos hasta que todos los servicios estén en estado `healthy`:

```bash
docker-compose --env-file .env.docker ps
```

Verificar que mem0 responde:

```bash
curl http://localhost:8000/health
# Esperado: {"status":"ok"}
```

## Paso 3 — Iniciar OmniSentinel

```bash
npm install
npm run dev
```

OmniSentinel corre en: http://localhost:3000

## Paso 4 — Seedear memoria inicial

```bash
curl -X POST http://localhost:3000/api/memory/seed \
  -H "Authorization: Bearer TU_TELEGRAM_WEBHOOK_SECRET"
```

Esperado:
```json
{"ok": true, "summary": [{"agent": "JESSY", "status": "seeded"}, ...]}
```

## Paso 5 — Configurar Telegram (primera vez)

```bash
curl -X POST http://localhost:3000/api/telegram/register \
  -H "Authorization: Bearer TU_TELEGRAM_WEBHOOK_SECRET"
```

## Para acceso desde Telegram (webhooks)

Telegram necesita una URL pública. Opciones:

**Opción A — ngrok (desarrollo):**
```bash
ngrok http 3000
# Copiar la URL https://xxx.ngrok.io
# Actualizar NEXT_PUBLIC_SITE_URL en .env.local
# Volver a ejecutar /api/telegram/register
```

**Opción B — VPS con dominio (producción):**
Apuntar dominio al VPS, instalar nginx, correr pm2.
Contactar al equipo de soporte para guía completa.

## Detener servicios

```bash
docker-compose --env-file .env.docker down
```

Los datos persisten en volúmenes Docker (`mem0_history`, `neo4j_data`, `postgres_data`).
Para borrar datos: `docker-compose --env-file .env.docker down -v`
