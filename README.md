# 卡牌展示与回购信息网站（card-market）

TCG 卡牌（宝可梦 / 游戏王 / 龙珠等）展示与回购信息站。前端用 **TanStack Start（SSR）**，内容管理用 **Directus 11 + PostgreSQL**，前端零自定义后端、只读公开 API。

数据模型与需求以 `docs/development.md`、`docs/requirements.md`、`.scratch/` 的 ticket 为准。

## 技术栈

- 前端：TanStack Start（React 19 + Vite 8 + TypeScript），Tailwind v4，SSR 数据加载，筛选状态写入 URL。
- 后端：Directus 11（headless CMS），PostgreSQL 16+，使用 `pg_trgm` GIN 索引做中文子串模糊匹配。
- 关系：维度表 `ips / series / sub_series / rarities`（IP→系列→子系列三层）+ 实体表 `cards`；外加 `banners / announcements / messages / site_settings`。

## 目录结构

```
docker-compose.yml        # 一键起 Directus + PostgreSQL（含 pg_trgm 初始化）
docker/postgres/init/     # Postgres 扩展初始化 SQL
directus/
  bootstrap.mjs           # 幂等落地集合/字段/关系/索引/Public 权限
  seed.mjs                # 样例数据（IP/卡牌/公告/banner/留言）
  run-local.sh            # 本地直连 Postgres 跑 Directus（绕过 Docker Hub 限制时的备选）
src/                      # TanStack Start 前端
  routes/                 # 首页 / 列表 / 详情 / 公告 / 联系 / 留言
  lib/directus.ts         # 公开 REST 客户端（读 + 留言提交）
  components/CardCard.tsx # 卡牌卡片复用组件
```

## 快速开始（Docker，推荐）

```bash
# 1. 启动后端（Directus 8055 + PostgreSQL 5432）
docker compose up -d

# 2. 落地数据模型与 Public 权限（幂等，可重复运行）
npm install
npm run directus:bootstrap

# 3. 写入样例数据
npm run directus:seed

# 4. 启动前端
npm run dev        # http://localhost:3000

# 后台：http://localhost:8055  （admin@example.com / admin12345，仅本地默认值）
```

> 生产务必替换 `docker-compose.yml` 与 `.env` 中的 `KEY` / `SECRET` / `ADMIN_PASSWORD` 为强随机值。

## 备选：本地已有 Postgres（无需 Docker 拉镜像）

当 Docker Hub 不可达、但本机装有 Postgres（如 Postgres.app）时：

```bash
# 启动本机 Postgres 并建立 directus 库 + pg_trgm 扩展（信任认证，仅本地）
# （参考 directus/run-local.sh 同目录的 init 命令）

# 用脚本直连本机 Postgres 跑 Directus（读取同脚本内环境变量）
./directus/run-local.sh      # 监听 :8055

# 另开终端：落地模型 + 种子
npm run directus:bootstrap
npm run directus:seed
npm run dev
```

## 脚本说明

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动前端开发服务器（默认 3000） |
| `npm run build` | 生产构建（client + SSR server） |
| `npm run start` | 生产启动（由 `prod-server.mjs` 桥接 `dist/server/server.js` 的 Web fetch 处理器） |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run directus:bootstrap` | 创建集合/字段/关系/M2O+M2M / 索引 / Public 权限 |
| `npm run directus:seed` | 写入样例维度、卡牌、公告、banner、站点设置、一条留言 |
| `npm run directus:snapshot` | 生成 `directus/schema.yaml`（需安装 directus CLI） |

## 权限模型（详见 development.md §4.8）

- **Public 角色**：只读 `ips/series/sub_series/rarities/cards/banners/announcements/site_settings/directus_files`（带 `status=published` 过滤）；可 `create` `messages`（仅 `content/contact_name/contact_info` 三字段，预设 `status=new`）。
- `messages` 有意**不**使用 Directus 内置 status（工单式生命周期：new/processed/archived/spam），与内容集合区分。
- 索引：`(ip_id, series_id, sub_series_id, code)` 组合唯一（code 非空时）；`cards.name` / `cards.code` 的 `pg_trgm` GIN 索引。

## 验收清单

- [ ] Directus 后台可登录，8 个集合已创建
- [ ] 组合唯一约束：`(ip, series, sub_series, code)` 重复 code 被拒
- [ ] 中文关键词搜索走 `pg_trgm`（如搜「皮卡」「197」）
- [ ] 公开角色无法读取未发布内容、无法读取/写入 `messages` 列表
- [ ] 前端列表页级联筛选（IP→系列→子系列）、价格区间、只看精品、排序、分页、URL 同步均生效
- [ ] 留言表单提交后仅写入允许字段
