#!/usr/bin/env bash
# 本地运行 Directus（连接本机 Postgres，绕过 Docker Hub 限制做端到端验证）。
# 前提：本地 Postgres 已在 5432 运行（见下方说明）。
# 生产环境请用 docker compose up -d（docker-compose.yml）。
set -a
KEY="dev-only-key-please-change"
SECRET="dev-only-secret-please-change"
DB_CLIENT="pg"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="directus"
DB_USER="directus"
DB_PASSWORD="directus"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin12345"
PORT="8055"
PUBLIC_URL="http://localhost:8055"
CORS_ENABLED="true"
CORS_ORIGIN="true"
CORS_CREDENTIALS="true"
STORAGE_LOCATIONS="local"
STORAGE_LOCAL_DRIVER="local"
STORAGE_LOCAL_ROOT="./directus/uploads"
set +a
exec npx -y directus start
