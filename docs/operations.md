# 本地运行与部署

本文把"怎么在本机把前后端跑起来"和"怎么部署到生产"合在一起说明。架构、数据模型、字段设计见 `docs/development.md`。

## 1. 组件与端口

- 前端：TanStack Start（Vite dev 端口 3000），只和 Directus API 通信。
- Directus：后台与 API，端口 8055，管理后台 `http://localhost:8055/admin`。
- PostgreSQL：业务数据与 Directus 元数据，监听宿主 5432。
- 图片：Directus 本地磁盘，目录 `directus/uploads`。compose 挂载该目录，本地运行也直接读写同一目录。

## 2. 前置条件（本机只需做一次）

1. 安装 Node.js。Docker 路径需要 Docker Desktop，本地路径不需要。
2. 宿主 PostgreSQL 已在 5432 监听（Postgres.app 或 brew 均可）。本机当前由 Postgres.app 提供。
3. 在宿主 Postgres 建好 `directus` 角色与库。这是最容易漏的一步。漏掉会让 Directus 启动即崩溃，日志出现 `FATAL 28000 role "directus" does not exist`，进而 `npm run directus:bootstrap` 报"无法登录 Directus"。

   ```bash
   PG_BIN="/Applications/Postgres.app/Contents/Versions/latest/bin"
   "$PG_BIN/psql" -h /tmp -U annilq -d postgres -c "CREATE ROLE directus WITH LOGIN PASSWORD 'directus' SUPERUSER;"
   "$PG_BIN/psql" -h /tmp -U annilq -d postgres -c "CREATE DATABASE directus OWNER directus;"
   ```

   不是 Postgres.app 时，把 `PG_BIN` 换成自己的 `psql` 路径即可。角色和库建在持久集群里，重启电脑不会丢。

4. `pg_hba.conf` 注意点：compose 里的 Directus 通过 `host.docker.internal` 连宿主 Postgres。本机当前 `pg_hba.conf` 只放行 `127.0.0.1/32` 与 `::1/128`（trust）。实测 Docker Desktop 的 `host.docker.internal` 可达，不需要改。换机器后若容器仍报 28000 且角色已存在，再放开 Docker 网桥网段，见第 7 节。

## 3. 启动 Directus（二选一，不要同时开）

### 3.1 用 Docker（推荐，与 compose 一致）

```bash
docker compose up -d
```

容器名是 `card-market-directus-1`，由 compose 项目名 `card-market`、服务名 `directus`、副本号 `-1` 拼成。它不等于早期脚本里写死的 `cardmarket-directus`，所以旧版 `npm run backend` 会误报"容器不存在"。

等健康检查通过：

```bash
curl -s --noproxy '*' http://localhost:8055/server/health   # 返回 200
```

首次启动会跑数据库迁移并创建管理员账号，约 20 到 60 秒。停止用 `docker compose down`，数据在宿主 Postgres、uploads 在本地挂载，都不会丢。

### 3.2 不用 Docker（run-local.sh）

```bash
./directus/run-local.sh
```

脚本会 `exec npx directus@11 start`，连 `localhost:5432`，前台运行。另开一个终端等上面的健康检查。停止按 Ctrl-C。

注意：Docker 路径和本地路径都占用 8055，两者只能开一个，否则后开的会因端口冲突退出。

## 4. 数据模型与种子数据

```bash
npm run directus:bootstrap   # 幂等：建集合/字段/关系/索引/Public 权限，并以 directus 角色直连 Postgres 建 pg_trgm 扩展与触发器
npm run directus:seed        # 写示例 IP、卡牌、店铺、公告、信息页、站点设置
```

两个脚本读 `.env` 的 `DIRECTUS_URL`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`。后台账号 `admin@example.com / admin12345`，后台地址 `http://localhost:8055/admin`。

## 5. 前端

```bash
npm run dev     # http://localhost:3000
```

前端读 `.env` 的 `VITE_DIRECTUS_URL`（浏览器端）与 `DIRECTUS_URL`（SSR 服务端），当前都指向 `http://localhost:8055`。生产构建用 `npm run build && npm start`。

## 6. 一键启动脚本 npm run backend

`scripts/start-backend.sh` 现在会检查 5432、动态识别并启动 compose 容器（检测不到 Docker 时回退到 `run-local.sh`）、做健康检查。它不再写死 `cardmarket-directus`，因此不会再误报容器不存在。脚本仍依赖第 2 节的前提：Postgres 在跑、`directus` 角色与库已建。

## 7. 故障排查

- Directus 起不来，或 bootstrap 报"无法登录 Directus"：先看 Directus 日志再下结论。
  - Docker：`docker logs card-market-directus-1`。若看到 `FATAL ... 28000`，是宿主 Postgres 还没有 `directus` 角色/库，回到第 2 节第 3 步。
  - 本地：`run-local.sh` 所在终端的输出。
- 端口冲突：Docker 与 `run-local.sh` 同时运行会抢 8055，只保留一个。
- 重启后 `/tmp/pg_cardmarket` 丢失：那是早期脚本的数据目录，系统重启会清理 `/tmp`。现在用 Postgres.app 的持久集群，角色/库建一次即可，不受重启影响。`directus/uploads` 里若已有图片而库被清空，那些图片会变成无引用的孤儿文件，按全新环境重新开始即可。
- `pg_hba.conf` 放行：仅当容器连宿主 Postgres 被拒时才需要。在 `pg_hba.conf` 末尾追加 `host all all 172.16.0.0/12 trust`，再执行 `SELECT pg_reload_conf();` 重载。若仍被拒，把网段放宽成 `0.0.0.0/0`。

## 8. 部署到生产

托管方式仍未最终确定（见 ticket `09-deployment`），但技术选型已定，落地时注意以下几点。

已定项：

- Directus 镜像 `ghcr.io/directus/directus:11`（`docker-compose.yml`，`pull_policy: never`，完全不依赖 Docker Hub）。
- 数据库：本仓库 compose 复用宿主或已有的 PostgreSQL（经 `host.docker.internal`）。生产可改成 compose 自带 postgres 服务，或用托管库。
- 存储：当前走路线 B 本地磁盘（`STORAGE_LOCAL_ROOT`）。生产建议走路线 A 对象存储（R2/S3/Spaces），见 `docs/development.md` 第 5 节与 ticket `04-oss-integration`。
- 安全：生产必须把 `KEY`、`SECRET` 换成强随机值，并收紧 `CORS_ORIGIN`，不要保留 `true`。

上线前必做（详细清单见 `docs/development.md` 第 11 节）：

- 对象存储自定义域名（CNAME）+ HTTPS / CDN。
- Directus 与前端同域，或正确配置 CORS / 反向代理，避免凭证泄露。
- 域名 HTTPS、反向代理、数据库备份、基础监控。
