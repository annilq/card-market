#!/usr/bin/env bash
# 启动后端服务：本机 PostgreSQL(5432) + Directus(8055)。
#
# Directus 默认用 Docker compose 启动（容器名 card-market-directus-1），
# 经 host.docker.internal 连宿主 PostgreSQL。检测不到 Docker 时回退到
# ./directus/run-local.sh 直接跑 Directus。
#
# 前置（一次性）：宿主 PostgreSQL 里要有 directus 角色与库，否则 Directus
# 启动即崩溃（日志 FATAL 28000）。详见 docs/operations.md 第 2 节。
# 幂等：已在运行则只报告状态，不会重启。
set -uo pipefail

PG_DATA="${PG_DATA:-/tmp/pg_cardmarket}"
PG_BIN="${PG_BIN:-/Applications/Postgres.app/Contents/Versions/latest/bin}"
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
    say "  重建：先按 docs/operations.md 第 2 节建 directus 角色/库，再 initdb + 建库，最后跑 npm run directus:bootstrap / directus:seed"
    exit 1
  fi
  if ! "$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/server.log" start; then
    say "✗ Postgres 启动失败，日志：$PG_DATA/server.log"
    exit 1
  fi
  for _ in $(seq 1 20); do port_open 5432 && break; sleep 0.5; done
  port_open 5432 && say "✓ Postgres 已启动" || { say "✗ Postgres 启动超时"; exit 1; }
fi

# ── 2. Directus（优先 Docker compose，回退本地）──
if docker compose ps --format '{{.Name}}' 2>/dev/null | grep -qE 'directus'; then
  if docker compose ps --format '{{.State}}' 2>/dev/null | grep -qE 'running|Up'; then
    say "✓ Directus 容器已在运行"
  else
    say "… 重启 compose 栈"
    docker compose up -d
  fi
elif command -v docker >/dev/null 2>&1 && docker images --format '{{.Repository}}' 2>/dev/null | grep -q 'directus'; then
  say "… 启动 compose 栈"
  docker compose up -d
else
  say "… 未检测到 Docker / Directus 镜像，回退到本地直接运行 Directus"
  exec ./directus/run-local.sh
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
  say "  查看日志：docker logs --tail 50 card-market-directus-1"
  exit 1
fi
say "✓ Directus 健康检查通过"

say ""
say "后台地址：$DIRECTUS_URL/admin"
say "账号密码：admin@example.com / admin12345"
say "前端读取后端：.env 中 DIRECTUS_URL / VITE_DIRECTUS_URL = $DIRECTUS_URL"
