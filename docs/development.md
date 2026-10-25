# 卡牌展示与回购信息网站 — 项目开发文档

> 本文档给出技术架构、数据模型、前后端集成、部署与开发任务拆解，作为方案选型、工作量评估与开发报价的工程依据。已定选型直接落地；标注"待定/待确认"的部分对应 wayfinder 决策 ticket（见 `.scratch/card-market/`）。本文与 `docs/requirements.md` 配套，前者定义"做什么"，本文定义"怎么做"。

---

## 1. 架构总览

系统采用**前后端分离 + Headless CMS** 模式：

```
┌─────────────────────────────────────────────┐
│  访客浏览器 / 手机端                          │
│  TanStack Start 前端（SSR，公开页面）          │
│  首页 / 卡牌列表 / 卡牌详情 / 公告 / 留言      │
└───────────────┬─────────────────────────────┘
                │ HTTPS（读取公开数据 / 提交留言）
                ▼
┌─────────────────────────────────────────────┐
│  Directus（后台 + API + 文件管理）            │
│  - REST/GraphQL API                          │
│  - 内容管理后台（管理员 UI）                  │
│  - 用户/角色/权限                            │
│  - 文件（图片）上传与管理                     │
└───────┬───────────────────────┬─────────────┘
        │                        │
        ▼                        ▼
┌──────────────┐        ┌──────────────────────┐
│ PostgreSQL   │        │ 对象存储(S3兼容)/本地文件 │
│ 业务数据     │        │ 经 Directus 存储驱动   │
└──────────────┘        └──────────────────────┘
```

**要点：**

- 前端**只**与 Directus API 通信，绝不持有存储凭证；图片访问地址由 Directus 经存储后端（或 CDN）回传。
- 管理员通过 Directus 自带后台（`/admin`）维护全部内容，无需自研 CRUD。
- 访客留言以"公开可创建、不可公开读取"的权限写入 `messages`，后台处理。

---

## 2. 技术选型与理由

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 前端框架 | **TanStack Start** | 基于 React Router 的全栈 React 框架，SSR 利于 SEO；与 Directus（Headless）天然契合；路由/数据获取一体化。 |
| 后台/API | **Directus** | 开源 Headless CMS，内置集合建模、文件管理、REST/GraphQL、角色权限，避免重复造后台。 |
| 数据库 | **PostgreSQL** | Directus 一等支持；关系型，适合分类/卡牌/留言等业务数据。 |
| 图片存储 | **海外 S3 兼容对象存储（R2/S3/Spaces）或 Directus 本地文件** | 海外部署（日本/美国）；见第 5 节二选一。 |
| 通信 | **Directus REST（或 GraphQL）** | 前端读内容、访客写留言；公开角色读取、管理角色鉴权。 |
| 部署 | **待定** | 见第 9 节 / ticket [09-deployment](../.scratch/card-market/issues/09-deployment.md)。 |

> 备选：若团队更熟悉纯 SPA，前端可退化为 Vite + React（牺牲 SSR/SEO，需预渲染补足）；但当前沿用 spec 选型 TanStack Start。

---

## 3. 部署架构（待定，选项）

| 方案 | 组成 | 优点 | 注意 |
| --- | --- | --- | --- |
| A. 单 VPS（Docker） | 一台 ECS：Directus + PostgreSQL + TanStack Start（Node）+ Nginx/Caddy | 成本低、可控、一体化 | 需自管备份/监控；单点 |
| B. 海外云拆分 | 海外 VPS/ECS(Directus+前端) + 托管 PostgreSQL + 对象存储(R2/S3/Spaces) + 可选 CDN | 托管数据库省心、易扩容、贴近 JP/US 用户 | 成本略高 |
| C. 托管 PaaS | Render/Fly(Directus+PG) + Vercel/Netlify(前端) | 上线快、免运维 | TanStack Start 需 Node adapter；跨厂商数据合规 |

**无论哪种方案，都必须解决两点：**

1. 所选对象存储的自定义域名（CNAME）+ HTTPS / CDN（如 R2 自定义域、S3 + CloudFront）；若选 Directus 本地文件，则由反向代理 / CDN 提供 HTTPS 与缓存。
2. Directus 与前端同域或正确配置 CORS / 反向代理，避免凭证泄露。

---

## 4. 数据模型设计（Directus collections）

> 草案；字段带 `?` 者为待确认，需先解决 ticket [01](../.scratch/card-market/issues/01-classification-model.md)/[02](../.scratch/card-market/issues/02-card-fields.md)/[05](../.scratch/card-market/issues/05-banner-capabilities.md)/[06](../.scratch/card-market/issues/06-announcement-capabilities.md)/[07](../.scratch/card-market/issues/07-message-anti-abuse.md)。

### 4.1 `categories`（卡牌分类）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid/auto | PK |
| name | string | 分类名称（如"宝可梦"） |
| dimension | enum? | 类别 / 系列 / 类型 / 稀有度（或拆多表，见 01） |
| parent_id | FK→categories? | 多层（类别→系列）时使用 |
| sort | integer | 展示顺序 |
| status | boolean/enum | 是否启用 |

### 4.2 `cards`（卡牌信息）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid/auto | PK |
| name | string | 卡牌名称（必填） |
| category_id | FK→categories | 所属类别 |
| series_id | FK→categories? | 所属系列 |
| card_type | string/enum? | 卡牌类型 |
| buyback_type | string/enum? | 回购方式/规则（语义待定） |
| card_status | enum | 裸卡 / 有包装 |
| rarity | enum? | 稀有程度 |
| images | M2M→directus_files | 商品图片（多图） |
| description | text/rich? | 描述 |
| price | decimal? | 价格（单值或区间待定） |
| is_high_value | boolean | 是否高价买取 |
| display_status | enum | 上架 / 下架 |
| sort | integer | 列表顺序 |
| created_at / updated_at | timestamp | 自动 |

### 4.3 `banners`（广告位）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | PK |  |
| title | string | 标题 |
| description | text? | 描述 |
| image | FK→directus_files | 图片（必填） |
| link | string? | 跳转链接 |
| position | enum? | 展示位置（多 banner 位待定，见 05） |
| status | boolean | 启用/停用 |
| sort | integer | 顺序 |
| start_time / end_time | timestamp? | 定时上下线（待定，见 05） |

### 4.4 `announcements`（公告）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | PK |  |
| title | string | 标题（必填） |
| body | rich text | 正文（富文本） |
| status | enum | 草稿 / 已发布 |
| published_at | timestamp | 发布时间（支持定时，见 06） |
| sort | integer | 顺序 |
| is_pinned | boolean? | 置顶（待定，见 06） |

### 4.5 `messages`（访客留言）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | PK |  |
| content | text | 留言内容（必填） |
| contact_name | string? | 联系人（待定是否必填，见 07） |
| contact_info | string? | 联系方式 |
| created_at | timestamp | 提交时间 |
| status | enum | 新 / 已处理 / 已归档 |

### 4.6 `site_settings`（网站基本信息）

单例集合（singleton），或 key-value 集合。字段：site_name, logo(fk→files), intro, x_account, shop_address, contact_phone, contact_email, business_hours, data_notice, privacy_policy(rich)。

### 4.7 内置集合

- `directus_files`：所有图片，存储位置指向对象存储或本地（见第 5 节）。
- `directus_roles` / `directus_users`：后台权限，新增"管理员"角色并对各业务集合配置 CRUD 权限。

### 4.8 权限模型

| 角色 | 读取 | 创建 | 其他 |
| --- | --- | --- | --- |
| Public（公开） | `cards`(仅上架) / `banners`(启用) / `announcements`(已发布) / `site_settings` / 图片 assets | `messages`（仅留言字段） | 不可读 `messages`；不可写其他集合 |
| Admin（管理员） | 全部 | 全部 | 全部（后台 UI） |

> 公开角色对 `messages` 需配置"字段级创建权限"（仅允许写入 content/contact 字段），并关闭公开读取。

---

## 5. 图片 / 文件存储方案（海外部署优化）

> 决策更新：项目部署在日本、美国等海外区域，原"阿里云 OSS"方案不再适用（国内 bucket 的网络与合规约束对海外无意义，且跨洋回源慢）。改为两条路线，按规模二选一：
> - **路线 A（推荐，生产）**：海外 S3 兼容对象存储（Cloudflare R2 / AWS S3 / DigitalOcean Spaces 等）。
> - **路线 B（最简，MVP/单服务器）**：Directus 内置本地文件管理（服务器持久卷）。
> 详见 ticket [04](../.scratch/card-market/issues/04-oss-integration.md)。

### 5.1 路线 A：海外 S3 兼容对象存储（推荐生产）

Directus 的 `s3` 存储驱动原生对接 AWS S3 及所有 S3 兼容服务；海外区域**无国内那种兼容坑**（无需 `FORCE_PATH_STYLE`，region/endpoint 直配即可）。

**多区域（日本 + 美国）建议：**

| 方案 | 说明 | 适合 |
| --- | --- | --- |
| **Cloudflare R2** | S3 兼容、全球边缘缓存、无出口流量费；单一桶即可服务 JP/US | 全球/双区域内容站首选 |
| **AWS S3 + CloudFront** | S3 落在最近区域（ap-northeast-1 东京 / us-east-1），CloudFront 做全球 CDN | 已在 AWS 生态 |
| **DigitalOcean Spaces** | S3 兼容，自带 CDN，配置简单，价格低 | 中小规模、想省心 |
| **Wasabi / Backblaze B2** | S3 兼容，存储便宜、无出口费 | 成本敏感 |

**示例：Cloudflare R2（Directus env）**
```env
STORAGE_LOCATIONS="r2"
STORAGE_R2_DRIVER="s3"
STORAGE_R2_KEY="<R2_ACCESS_KEY_ID>"
STORAGE_R2_SECRET="<R2_SECRET_ACCESS_KEY>"
STORAGE_R2_BUCKET="<bucket>"
STORAGE_R2_REGION="auto"
STORAGE_R2_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
STORAGE_R2_ACL="public-read"
```
> R2 公开访问建议走 R2 的**自定义域 + CDN**（或 `r2.dev` 临时域）；前端图片 URL 使用 CDN/自定义域名。

**示例：AWS S3（东京）**
```env
STORAGE_LOCATIONS="s3"
STORAGE_S3_DRIVER="s3"
STORAGE_S3_KEY="<AWS_ACCESS_KEY_ID>"
STORAGE_S3_SECRET="<AWS_SECRET_ACCESS_KEY>"
STORAGE_S3_BUCKET="<bucket>"
STORAGE_S3_REGION="ap-northeast-1"
STORAGE_S3_ACL="public-read"
```
> 配 CloudFront 作为图片 CDN；前端用 CloudFront 域名访问。

### 5.2 路线 B：Directus 本地文件管理（最简 MVP）

不引入外部对象存储，Directus 直接把图片存到服务器本地磁盘（或挂载的持久卷），由 `local` 驱动管理。

```env
STORAGE_LOCATIONS="local"
STORAGE_LOCAL_DRIVER="local"
STORAGE_LOCAL_ROOT="/directus/uploads"
```

- **优点**：零外部依赖、零额外账单、配置最简单，最贴合"Directus 自带文件管理"。
- **注意**：
  - 必须挂载**持久卷**并定期备份（容器/实例重建不丢图）。
  - 单服务器可用；若多实例横向扩展需共享存储（NFS/托管卷），此时更推荐路线 A。
  - 静态资源可经 CDN / 反向代理缓存提速。

### 5.3 访问地址与图片优化

- 公开读（`public-read` 或本地 + CDN）：前台直接用图片 URL。
- 增强（见 ticket [08](../.scratch/card-market/issues/08-seo-ops.md)）：CDN + Directus assets 接口做缩略图 / WebP 转换（`/assets/<id>?width=&format=webp`），对双区域访问尤其有益。

### 5.4 安全性

- 凭证仅在 Directus 服务端（env），**绝不**进入前端。
- 公开角色只应拿到图片 URL，不能拿到写入凭证。
- 使用 CDN / 自定义域名并强制 HTTPS。

---

## 6. 前后端集成

### 6.1 API 选择

- **读取**：Directus REST（`/items/<collection>`）或 GraphQL。公开页面用无 token 的公开角色读取；管理操作带 admin token。
- **留言写入**：对 `messages` 配置公开创建权限，前端 `POST /items/messages` 仅传允许字段。

### 6.2 鉴权

- 管理员：Directus 登录拿 access token，调用受保护接口。
- 访客：无 token，仅能命中公开角色的读取/创建规则。

### 6.3 安全

- 前端不配置任何对象存储/Directus 写凭证。
- Directus 开启 `ENABLED` 的 CORS 白名单（仅限前端域名）。
- 留言接口加基础校验 + 防滥用（见 [07](../.scratch/card-market/issues/07-message-anti-abuse.md)）。

---

## 7. 前台页面与路由（TanStack Start）

| 路由 | 页面 | 数据来源 |
| --- | --- | --- |
| `/` | 首页（搜索框、推荐卡牌、banner 轮播、公告入口、分类入口、店铺信息） | cards/banners/announcements/site_settings |
| `/cards` | 卡牌列表（筛选/分页/排序） | cards + categories（筛选待 03 定） |
| `/cards/:id` | 卡牌详情（图片、描述、回购信息） | cards |
| `/announcements` | 公告列表 | announcements |
| `/announcements/:id` | 公告详情 | announcements |
| `/contact` | 店铺信息 / 联系方式 | site_settings |
| `/message` 或弹层 | 留言表单 | POST messages |
| `/search?q=` | 搜索结果（待 03 定） | cards search |

> 后台不单独开发，复用 Directus `/admin`。

---

## 8. 后台配置清单（Directus）

1. 创建集合：`categories` / `cards` / `banners` / `announcements` / `messages` / `site_settings`（字段见第 4 节）。
2. 配置关系：`cards.category_id→categories`、`cards.images→directus_files`（M2M）、`banners.image→directus_files`。
3. 角色与权限：
   - 新建/调整 `Admin` 角色：全集合 CRUD。
   - 配置 `Public` 角色：只读公开集合（带状态过滤）、仅可创建 `messages`。
4. 文件存储：配置对象存储或本地存储位置（第 5 节 env）。
5. 界面（可选）：为集合配置友好显示名、编辑布局、缩略图。

---

## 9. 开发任务拆解与里程碑

> 依赖顺序：先定开放决策（第 9 节 ticket）→ 再细化数据模型 → 再实现。

| 阶段 | 任务 | 依赖 | 产出 |
| --- | --- | --- | --- |
| M0 决策 | 逐张 grilling/research 解决 01–09 ticket | — | 决策回填需求/开发文档 |
| M1 环境 | 搭建 Directus + PostgreSQL + 对象存储/本地存储（自定义域名+HTTPS/CDN） | 04,09 | 可运行后台与存储 |
| M2 模型 | 在 Directus 落地各集合与关系、权限 | 01,02,05,06,07 | 数据模型 + 权限 |
| M3 后台 | 配置后台界面、上传流程验证（存储全链路） | M1,M2 | 可用后台 |
| M4 前台 | TanStack Start 页面与路由、API 对接 | M2 | 公开网站 |
| M5 留言 | 留言表单 + 公开创建权限 + 防滥用 | 07 | 留言闭环 |
| M6 部署 | 选定部署方案、域名/HTTPS、反向代理、备份 | 09 | 上线 |
| M7 测试 | 功能测试 + 验收（见需求文档第 8 节） | 全部 | 验收报告 |

---

## 10. 风险与待确认

| 风险 / 待确认 | 影响 | 对应 ticket |
| --- | --- | --- |
| 存储选型与多区域访问（JP/US） | 上线可达性、延迟 | [04](../.scratch/card-market/issues/04-oss-integration.md)、[09](../.scratch/card-market/issues/09-deployment.md) |
| 分类/卡牌字段未定 | 数据模型返工风险 | [01](../.scratch/card-market/issues/01-classification-model.md)、[02](../.scratch/card-market/issues/02-card-fields.md) |
| 留言防滥用不足 | 垃圾留言 | [07](../.scratch/card-market/issues/07-message-anti-abuse.md) |
| 部署方案未定 | 成本与运维 | [09](../.scratch/card-market/issues/09-deployment.md) |
| SEO/统计/CDN 范围 | 非功能增强 | [08](../.scratch/card-market/issues/08-seo-ops.md) |

---

## 11. 测试与上线检查清单

- [ ] Directus 启动，后台可登录。
- [ ] 各集合 CRUD 在后台可用。
- [ ] 图片上传 → OSS → 前台展示 全链路通过（含自定义域名 HTTPS）。
- [ ] 公开角色无法读取 `messages`、无法写其他集合。
- [ ] 访客留言成功写入并进入后台待处理。
- [ ] 前台：已下架卡牌不展示；banner/公告按状态/时间正确显示。
- [ ] 移动端/桌面端响应式正常。
- [ ] 部署：域名 HTTPS、反向代理、数据库备份、基础监控就绪。
- [ ] 提供部署与后台使用说明文档。

---

## 参考

- `docs/requirements.md` — 配套需求文档。
- `spec.md` — 原始需求草稿。
- `.scratch/card-market/map.md` 与 `issues/` — wayfinder 决策地图与 ticket。
- Directus Files / Storage 文档（s3 驱动、FORCE_PATH_STYLE）。
- 阿里云 OSS 文档（Endpoint、自定义域名 CNAME、2025-03 外网域名约束）。
