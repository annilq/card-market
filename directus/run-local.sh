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
# 自定义后台扩展（地图选点接口 map-picker）加载目录
EXTENSIONS_PATH="./directus/extensions"
# 将 npm 缓存指向可写目录，绕开 ~/.npm/_cacache 中残留的 root 属主文件导致的 EPERM。
# （一次性彻底修复可用：sudo chown -R 501:20 "$HOME/.npm"）
NPM_CACHE_DIR="${TMPDIR:-/tmp}/cardmarket-npmcache"
mkdir -p "$NPM_CACHE_DIR"
npm_config_cache="$NPM_CACHE_DIR"
set +a
# 固定到 11.x，与 docker-compose 的 directus/directus:11 镜像、以及地图选点扩展的
# host(^11.0.0) 保持一致；避免 npx 拉到不兼容的 12.x 导致启动失败。
exec npx -y directus@11 start
