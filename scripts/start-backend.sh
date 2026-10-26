#!/usr/bin/env bash
# 启动后端服务：本机 PostgreSQL(5432) + Directus 容器(8055)。
#
# 本机实际采用的是「原生 Postgres + 独立 Docker 容器」的组合（不是 docker compose）：
#   - 数据：/tmp/pg_cardmarket（本机 Postgres.app 的实例，PGPASSWORD=directus）
#   - Directus：容器 cardmarket-directus，DB_HOST=host.docker.internal，端口 8055
# 详见 README「本机当前环境」一节。幂等：已在运行则只报告状态，不会重启。
set -uo pipefail

PG_DATA="${PG_DATA:-/tmp/pg_cardmarket}"
PG_BIN="${PG_BIN:-/Applications/Postgres.app/Contents/Versions/latest/bin}"
CONTAINER="${CONTAINER:-cardmarket-directus}"
DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8055}"

say() { printf '%s\n' "$*"; }
port_open() { nc -z 127.0.0.1 "$1" >/dev/null 2>&1; }

# ── 1. 数据库 ────────────────────────────────────────────────
if port_open 5432; then
  say "✓ Postgres 已在 5432 运行"
else
  say "… Postgres 未运行，启动数据目录 $PG_DATA"
  if [ ! -d "$PG_DATA" ]; then
    say "✗ 数据目录不存在：$PG_DATA"
    say "  说明数据库已被清空（/tmp 在重启后会被系统清理）。"
    say "  重建：initdb + 建库 + 跑 npm run directus:bootstrap / directus:seed"
    exit 1
  fi
  if ! "$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/server.log" start; then
    say "✗ Postgres 启动失败，日志：$PG_DATA/server.log"
    exit 1
  fi
  for _ in $(seq 1 20); do port_open 5432 && break; sleep 0.5; done
  port_open 5432 && say "✓ Postgres 已启动" || { say "✗ Postgres 启动超时"; exit 1; }
fi

# ── 2. Directus 容器 ────────────────────────────────────────
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
  say "✓ Directus 容器已在运行"
elif docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
  say "… 启动已有容器 $CONTAINER"
  docker start "$CONTAINER" >/dev/null || { say "✗ 容器启动失败"; exit 1; }
else
  say "✗ 容器 $CONTAINER 不存在"
  say "  可选：docker compose up -d（自带 Postgres 容器，注意与本机 5432 冲突）"
  say "        或 ./directus/run-local.sh（不用 Docker，直接跑 Directus）"
  exit 1
fi

# ── 3. 健康检查 ─────────────────────────────────────────────
code=""
for _ in $(seq 1 60); do
  code=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' --max-time 2 "$DIRECTUS_URL/server/health" || true)
  [ "$code" = "200" ] && break
  sleep 1
done
if [ "$code" != "200" ]; then
  say "✗ Directus 未就绪（HTTP ${code:-无响应}）"
  say "  查看日志：docker logs --tail 50 $CONTAINER"
  exit 1
fi
say "✓ Directus 健康检查通过"

say ""
say "后台地址：$DIRECTUS_URL/admin"
say "账号密码：admin@example.com / admin12345"
say "前端读取后端：.env 中 DIRECTUS_URL / VITE_DIRECTUS_URL = $DIRECTUS_URL"
