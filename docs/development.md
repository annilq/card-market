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

> 草案；[02](../.scratch/card-market/issues/02-card-fields.md) 卡牌字段、[01](../.scratch/card-market/issues/01-classification-model.md) 分类维度、[05](../.scratch/card-market/issues/05-banner-capabilities.md) banner 能力、[06](../.scratch/card-market/issues/06-announcement-capabilities.md) 公告能力、[07](../.scratch/card-market/issues/07-message-anti-abuse.md) 留言防滥用**均已决议**；`messages` 字段已收敛（见 §4.5）。

### 4.1 分类与维度集合（已定，见 ticket [01](../.scratch/card-market/issues/01-classification-model.md)）

> 决策要点：多 IP 卡牌集市；**三层 IP→系列→子系列**；`稀有程度` 为独立维度集合 + 关系（非 `cards` 属性列）；`卡牌类型`(card_types) 已删除；`ips`/`series`/`sub_series`/`rarities` 四个维度均由 Directus 后台配置化维护。`状态` 用 Directus 内置 status（不计入分类维度）；`排序` 仅维度表保留（用于 facet 排序），`cards` 不设 sort。

#### 4.1.1 `ips`（IP 维度 / 卡牌类别 / 大类）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid/auto | PK |
| name | string | IP / 大类名称（如"宝可梦""游戏王""龙珠"） |
| sort | integer | 展示顺序（facet 侧边栏） |
| status | boolean | 是否启用 |

#### 4.1.2 `series`（系列分类，IP 子级）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | PK |  |
| name | string | 系列名称（如"MEGA""朱紫""剑盾"） |
| ip_id | FK→ips | 所属 IP / 大类 |
| sort | integer | 展示顺序（facet 侧边栏） |
| status | boolean | 是否启用 |

#### 4.1.3 `sub_series`（子系列，系列子级，必填）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | PK |  |
| name | string | 子系列名称（如 `[M6a] 30th CELEBRATION`） |
| series_id | FK→series | 所属系列 |
| sort | integer | 展示顺序（facet 侧边栏） |
| status | boolean | 是否启用 |

> `sub_series` **必填**：即使仅两层的 IP（如龙珠）也须建空壳子系列占位，以保证 `cards` 上 (ip_id, series_id, sub_series_id, code) 组合唯一约束有效（SQL NULL 不参与唯一匹配）。

#### 4.1.4 `rarities`（稀有程度维度，全局单一枚举）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | PK |  |
| name | string | 稀有度名称（如 SSR / UR / HR，按 IP 分馆时于 facet 层过滤） |
| sort | integer | 展示顺序 |
| status | boolean | 是否启用 |

### 4.2 `cards`（卡牌信息）

> 字段定义、数据类型、必填规则与枚举配置化结论已定（见 [02](../.scratch/card-market/issues/02-card-fields.md)）。列表默认按 `price` DESC；`is_high_value` 仅作「只看精品」筛选，不影响排序。检索/筛选/排序/分页/URL 态的范围见 ticket [03](../.scratch/card-market/issues/03-frontend-search-filter.md)（已 resolved）：暴露排序为 价格升降 + 最新上架；稀有程度仅作字典过滤；关键词搜 卡名+编号（pg_trgm 索引）；价格区间 `_between`；分页 + URL 同步。

| 字段 | 类型 | 说明 | 必填 |
| --- | --- | --- | --- |
| id | uuid/auto | PK | — |
| name | string | 卡牌名称 | 始终 |
| ip_id | FK→ips | 所属 IP / 大类（见 4.1.1） | 始终 |
| series_id | FK→series | 所属系列（见 4.1.2） | 始终 |
| sub_series_id | FK→sub_series | 所属子系列（见 4.1.3，必填） | 始终 |
| code | string | 收藏编号，如 `123/197` / `SWSH01-025` | 上架必填 |
| rarity_id | FK→rarities | 稀有程度（见 4.1.4） | 始终 |
| price | decimal(10,2) | 卖价（标价，仅卖价，不含买取价/估值） | 上架必填 |
| images | M2M→directus_files | 商品图片（多图） | 上架≥1 |
| description | text | 描述 | 可选 |
| is_high_value | boolean | 是否高价买取（**纯标识**：运营自由标注、无统一标准，仅「只看精品」筛选） | 可选（默认 false） |
| card_status | enum | 裸卡 / 有包装（代码常量，不进后台） | 始终（默认 裸卡） |
| status | — | **Directus 内置 status**：draft / published / archived（草稿=下架、上架=published、下架或已售归档=archived） | — |
| created_at / updated_at | timestamp | 自动 | — |

> 已删除：`category_id`（并入 `ip_id`）、`type_id`/`card_types`（卡牌类型维度已删）、`buyback_type`、`display_status`（改用 Directus 内置 status）、`sort`（列表纯 price DESC，无手动置顶）。`code` 建议 (ip_id, series_id, sub_series_id, code) 组合唯一。

### 4.3 `banners`（广告位，单槽位首页轮播）

> banner 能力已定（见 [05](../.scratch/card-market/issues/05-banner-capabilities.md)）：**单槽位**（仅首页顶部轮播，无 position 枚举）、**无定时上下线**（仅靠 Directus status 控制）、**轮播自动播放/间隔为前端硬编码常量**（不进模型）、status **统一复用 Directus 内置 status**（与 cards 一致，删原 boolean 启用/停用）。

| 字段 | 类型 | 说明 | 必填 |
| --- | --- | --- | --- |
| id | PK |  | — |
| title | string | 标题 | 可选 |
| description | text | 描述 | 可选 |
| image | FK→directus_files | 轮播图（必填） | 始终 |
| link | string | 跳转链接（内部路由或外部 URL） | 可选 |
| sort | integer | 轮播顺序（单槽位内） | 可选（默认 0） |
| status | — | **Directus 内置 status**：draft / published / archived | — |

> 已删除：原 `position`（多槽位枚举）、原 boolean `status`（启用/停用）、`start_time` / `end_time`（定时上下线）。`link` 内/外链安全与图片宽高比为实现期次要项（见 05）。

### 4.4 `announcements`（公告）

> 公告能力已定（见 [06](../.scratch/card-market/issues/06-announcement-capabilities.md)）：**status 统一复用 Directus 内置 status**（draft/published/archived，与 cards/banners 一致）；**需要置顶 `is_pinned`**；**需要定时发布**（`published_at` 未来暂不展示）；**手动归档**（`archived`，无自动过期、无 end_time）。

| 字段 | 类型 | 说明 | 必填 |
| --- | --- | --- | --- |
| id | PK |  | — |
| title | string | 标题 | 始终（必填） |
| body | rich text | 正文（富文本） | 可选 |
| published_at | timestamp | 发布时间；未来=定时发布，null=发布即展示 | 可选 |
| is_pinned | boolean | 置顶 | 可选（默认 false） |
| sort | integer | 手动排序 tie-break（组内） | 可选（默认 0） |
| status | — | **Directus 内置 status**：draft / published / archived | — |
| created_at / updated_at | timestamp | 自动 | — |

> 已删除：原自定义 `status` enum（草稿/已发布，改 Directus status）。前台可见 = `status=published AND (published_at IS NULL OR published_at <= now)`；排序 `is_pinned DESC, published_at DESC`。`body` 富文本渲染需防 XSS。

### 4.5 `messages`（访客留言）

> 留言防滥用已定（见 [07](../.scratch/card-market/issues/07-message-anti-abuse.md)）：**直连 Directus public create**（零自定义后端）；防滥用仅取**边缘限流 + 字段校验**（不引验证码/频率限制/内容审核/蜜罐）；**仅站内通知**（无邮件）；**联系方式全可选**；垃圾留言由管理员手动打 **`已标记垃圾`** 状态。

| 字段 | 类型 | 说明 | 必填 |
| --- | --- | --- | --- |
| id | PK |  | — |
| content | text | 留言内容 | 始终（必填） |
| contact_name | string | 联系人（选填，降门槛） | 可选 |
| contact_info | string | 联系方式（邮箱/电话/微信，选填） | 可选 |
| created_at | timestamp | 提交时间 | 自动 |
| status | enum | **新 / 已处理 / 已归档 / 已标记垃圾**（自定义枚举，非 Directus 内置 status） | — |

> `messages` **有意不使用** Directus 内置 status：留言非发布内容、无 `published` 语义，其生命周期是工单式处理流，自定义枚举更贴切（与 cards/banners/announcements 统一用 Directus status 的取向**有意不同**）。

### 4.6 `site_settings`（网站基本信息）

单例集合（singleton），或 key-value 集合。字段：site_name, logo(fk→files), intro, x_account, shop_address, contact_phone, contact_email, business_hours, data_notice, privacy_policy(rich)。

### 4.6.1 `info_pages`（审核用信息页）

面向网站审核的四个固定信息页：**运营信息 / 个人信息收集 / 利用规则 / 数据使用**。前端在公共 footer 提供入口，正文由后台维护。

| 字段 | 类型 | 说明 | 必填 |
| --- | --- | --- | --- |
| id | PK |  | — |
| page_key | string（唯一） | 页面标识：`operation` / `personal-info` / `terms` / `data-usage` | 始终 |
| title | string | 页面标题（后台可改；前端详情页 `<h1>` 用它） | 始终 |
| body | rich text | 正文（Markdown/HTML，渲染与公告一致） | 可选 |
| sort | integer | 排序（页脚顺序由前端清单固定，不依赖它） | 可选（默认 0） |
| status | — | **Directus 内置 status**：draft / published / archived | — |

设计要点：

- **标识与入口的职责分离**：`page_key` 是前端路由 `/info/<page_key>` 与页脚入口的对接键；四个 key 与顺序在
  `src/lib/info-pages.ts` 硬编码（审计要求入口必须始终存在，不能因后台误删记录而变成空链接），
  后台只负责内容（标题 + 正文）。
- **页脚入口文案走界面语言**（`messages.ts` 的 `infoOperation` 等），不取后台 `title`——
  与头部导航一致；「不翻译 Directus 内容」的边界只针对正文与详情页标题。
- **后台未发布时不 404**：`/info/<已登记 key>` 始终 200，正文缺失时显示「尚未发布」，
  保证审核爬虫/人工点击四个入口都能落到有效页面。**未登记的 key**（如 `/info/bogus`）才 404。
- 唯一索引 `uniq_info_pages_page_key` 保证同 key 只有一条。

### 4.7 内置集合

- `directus_files`：所有图片，存储位置指向对象存储或本地（见第 5 节）。
- `directus_roles` / `directus_users`：后台权限，新增"管理员"角色并对各业务集合配置 CRUD 权限。

### 4.8 权限模型

| 角色 | 读取 | 创建 | 其他 |
| --- | --- | --- | --- |
| Public（公开） | `cards`(仅 published) / `banners`(仅 published) / `announcements`(仅 published 且 published_at<=now) / `shops`(仅 published) / `info_pages`(仅 published) / `site_settings` / 图片 assets | `messages`（仅 content/contact_name/contact_info 创建） | 不可读 `messages`；不可写其他集合 |
| Admin（管理员） | 全部 | 全部 | 全部（后台 UI） |

> 公开角色对 `messages` 需配置"字段级创建权限"（仅允许写入 `content`/`contact_name`/`contact_info` 字段），并关闭公开读取。垃圾留言由管理员在后台手动置 `status=已标记垃圾`。

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
- 留言接口加基础校验 + 防滥用：直连 Directus public create + 边缘限流（Cloudflare/Nginx），不引自定义网关；详见 [07](../.scratch/card-market/issues/07-message-anti-abuse.md)（已 resolved）。

---

## 7. 前台页面与路由（TanStack Start）

| 路由 | 页面 | 数据来源 |
| --- | --- | --- |
| `/` | 首页（搜索框、推荐卡牌、banner 轮播、公告入口、分类入口、店铺信息） | cards/banners/announcements/site_settings |
| `/cards` | 卡牌列表（筛选/分页/排序/关键词） | cards + ips（检索筛选已定，见 03 与 §7.1） |
| `/cards/:id` | 卡牌详情（图片、描述、回购信息） | cards |
| `/announcements` | 公告列表 | announcements |
| `/announcements/:id` | 公告详情 | announcements |
| `/shops` | 店铺列表 + 地图 | shops |
| `/info/:key` | 审核信息页：`/info/operation`、`/info/personal-info`、`/info/terms`、`/info/data-usage`（见 §4.6.1） | info_pages |
| `/message` 或弹层 | 留言表单 | POST messages |
| `/cards?q=` | 关键词搜索结果（卡名+编号，见 03）— 首页搜索框跳转目标；`/search` 不再单列 | cards(name+code) |

> 后台不单独开发，复用 Directus `/admin`。
> 公共 footer 常驻四个信息页入口（运营信息 / 个人信息收集 / 利用规则 / 数据使用），顺序与文案见 §4.6.1。

### 7.1 卡牌列表检索 / 筛选 / 排序（见 ticket [03](../.scratch/card-market/issues/03-frontend-search-filter.md)）

- **筛选 UI**：IP→系列→子系列 **级联下钻**（每层多选 checkbox，父约束子可见性）+ 独立扁平 facet（稀有程度多选、只看精品开关、价格区间、关键词框）。
- **排序**：价格降序（默认）/ 价格升序 / 最新上架；稀有程度仅作字典过滤、不参与排序。
- **关键词**：仅 卡名 + 编号，Directus `_icontains` + `pg_trgm` GIN 索引（CJK 友好），无相关度排序（相关度排名需另建 tsvector + 自定义接口，本期不做）。
- **价格区间**：`filter[price][_between]=[min,max]`。
- **加载**：分页（`page`/`limit`）+ 全部过滤态写入 URL query（可分享 / SEO 友好）。
- 详情页多图画廊不属本范围，归 `/cards/:id`。

### 7.2 前端界面多语言（见 ticket [10](../.scratch/card-market/issues/10-frontend-i18n.md)）

语言：`zh`（默认）/ `ja` / `en`。**语言是 URL 的可选第一段**，默认语言不带前缀：

| URL | 语言 |
| --- | --- |
| `/cards`、`/cards/1` | 简体中文（默认，无前缀） |
| `/ja/cards`、`/en/cards/1` | 日语 / 英语 |
| `/foo`、`/de/cards` | 404（未知语言段不静默降级） |

实现约定（改动前先读，容易踩）：

- **路由结构**：全部页面挂在 `src/routes/{-$locale}.tsx` 布局路由下（TanStack Router 可选路径段），文件名形如 `{-$locale}.cards.index.tsx`。`routeTree.gen.ts` 由构建自动生成，不要手改。
- **文案**：`src/lib/i18n/messages.ts`。`zh` 是唯一键来源，`MessageKey = keyof typeof zh`；`ja`/`en` 为 `Record<MessageKey, string>`，**少翻或多写一条键都会 typecheck 报错**。插值用 `{name}`，`t('totalCount', { total })`。
- **取值**：`useLocale()` 从 pathname 首段派生（无 Provider、无 locale state，保证 SSR 与客户端一致）；`useT()` 返回按 locale 缓存的稳定引用。日期用 `formatDate(x, locale)`（内部 `Intl`，固定 `Asia/Tokyo` 时区避免抖动）。
- **站内链接**：`<Link to>` 必须带 `/{-$locale}` 前缀。语言段由当前路由**自动继承**，不要传 `params={{ locale }}`——显式传无效，裸 `to` 不会因 params 长出语言段。索引路由的 `to` 是 `'/{-$locale}'`（**无**尾斜杠）。
- **后台内容里的站内路径**（如 `banners.link`）绕过路由类型系统，须经 `localizeHref(path, locale)` 补前缀，否则从 `/ja` 点进去掉回中文。
- **语言切换**：`__root.tsx` 的 `LocaleSwitcher` 用相对路由 + params reducer + `search: true`，保留路径、路径参数与查询串。切到默认语言必须传 `locale: undefined`（传 `'zh'` 会生成 404 的 `/zh/...`）。
- **SEO**：`<html lang>`、每语言 `<title>`/`description`（在 `LOCALES` 注册表）、`hreflang` 交替链接（含 `x-default`）均按当前语言输出。
- **不翻译 Directus 内容**：卡名、公告正文、店铺地址等按后台原样输出。界面语言 ≠ 内容语言，内容多语言是 Directus 字段翻译的职责。
- **验收**：`node scripts/check-i18n.mjs http://localhost:3000`（三语 SSR 文案、`<html lang>`、未知语言段 404、hreflang、banner 链接补前缀、内容不被翻译）。

---

## 8. 后台配置清单（Directus）

1. 创建集合：`ips` / `series` / `sub_series` / `rarities` / `cards` / `banners` / `announcements` / `messages` / `shops` / `info_pages` / `site_settings`（字段见第 4 节）。
2. 配置关系（M2O，`npm run directus:bootstrap` 自动完成）：
   - `series.ip_id → ips`、`sub_series.series_id → series`
   - `cards.ip_id → ips`、`cards.series_id → series`、`cards.sub_series_id → sub_series`、`cards.rarity_id → rarities`、`cards.user_created → directus_users`
   - `banners.image → directus_files`、`site_settings.logo → directus_files`（两列须为 `uuid` 类型）
   - `cards.images` 是 **M2M**：关联表 `cards_images`（`cards_id` + `directus_files_id` + `sort`），
     `cards.images` 本身是 `type: alias` 的虚拟字段（`special: ['m2m']`、`interface: 'list-m2m'`）。
     **建表顺序不能颠倒**：建关联表 → 迁移旧数据 → 删旧 json 列 → 建两条 relations → 建 alias 字段。
     Directus 的 Files 接口只支持 alias 字段（`types: ['alias']`），挂在真实 json 列上会出现
     「同一字段返回两条（一条真实、一条 alias）」或 `column does not exist`。
   - **M2M 的 `junction_field` 是必需元数据**（`directus_relations.meta.junction_field`，两条关系互为对方字段）。
     后台 `list-m2m` 用 `useRelationM2M()` 找关系，条件是
     `related_collection === 当前集合 && one_field === 当前字段 && junction_field 非空`；
     缺这一项 → 找不到关系 → 字段位置只剩一条警告
     `The relationship is not configured properly or you don't have permission to access it`，
     「新建 / 添加现有 / 上传」按钮全部消失。此时**接口层仍完全正常**（`cards.images` 仍能读写），
     所以症状只出现在后台界面，别误判成权限问题。
     `bootstrap` 的 `ensureJunctionSide()` 会同时校验 `junction_field` 与外键约束并按需修复。
   - ⚠ 修 M2M 元数据**不能用 `/relations` 的裸 PATCH**：Directus 的 `updateOne` 会先 DROP 外键、
     改列类型、再 ADD 外键，`schema.on_delete` 只从请求体里取。漏传 `schema` 会让外键直接消失
     （是真实踩过的坑）。`ensureJunctionSide()` 始终带上 `schema: { on_delete: 'NO ACTION' }`，
     并额外检查 `pg_constraint`，外键丢了会一并补回。
3. **字段接口约定（重要）**：多对一下拉必须用 `interface: 'select-dropdown-m2o'`（配 `options.template = '{{name}}'`）。
   `relational` 只是展示方式（display），若误写成 interface，后台会退化成「手输主键」的文本框，
   且 `/relations` 端点会忽略 filter 导致关系建不起来——两者叠加就是"后台只能输入 ID"的根因。
4. 角色与权限：
   - 新建/调整 `Admin` 角色：全集合 CRUD。
   - 配置 `Public` 角色：只读公开集合（带状态过滤）、仅可创建 `messages`。
   - M2M 需额外给 `Public` 授予 `cards_images` 的 read（字段 `cards_id/directus_files_id/sort`），
     否则匿名读 `cards.images` 会被拒绝。
5. 文件存储：配置对象存储或本地存储位置（第 5 节 env）。
6. 界面本地化：`directus_settings.default_language = 'zh-CN'`；集合与字段在 `meta.translations`
   写入**中文 + 日文**名（bootstrap 已内置：中文写在集合声明里，日文集中在
   `COLLECTION_LABELS_JA` / `FIELD_LABELS_JA`），后台侧边栏与表单标签随界面语言切换。
   Directus 界面语言内置支持 `zh-CN` / `ja-JP` 等，单个用户在头像 → Settings → Language 自选。

> 说明：`select-dropdown` 的 choices 文本（草稿/已发布等）是固定字符串，不随界面语言变化；
> 如需多语言选项标签，应改为翻译集合或双语文本。

---

## 9. 开发任务拆解与里程碑

> 依赖顺序：先定开放决策（第 9 节 ticket）→ 再细化数据模型 → 再实现。

| 阶段 | 任务 | 依赖 | 产出 |
| --- | --- | --- | --- |
| M0 决策 | 逐张 grilling/research 解决 01–09 ticket | — | 决策回填需求/开发文档 |
| M1 环境 | 搭建 Directus + PostgreSQL + 对象存储/本地存储（自定义域名+HTTPS/CDN） | 04,09 | 可运行后台与存储 |
| M2 模型 | 在 Directus 落地各集合与关系、权限 | 01,02,05(已决议),06(已决议),07(已决议) | 数据模型 + 权限 |
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
| ~~卡牌字段未定（02）~~ **（已决议）** | 数据模型已收敛，无返工风险 | [02](../.scratch/card-market/issues/02-card-fields.md) |
| ~~前台检索/筛选范围未定（03）~~ **（已决议）** | 交互/API 范围已收敛，无返工风险 | [03](../.scratch/card-market/issues/03-frontend-search-filter.md) |
| ~~留言防滥用不足~~ **（已决议）** | 弱防护（直连 Directus + 边缘限流 + 字段校验），无自定义网关 | [07](../.scratch/card-market/issues/07-message-anti-abuse.md) |
| 部署方案未定 | 成本与运维 | [09](../.scratch/card-market/issues/09-deployment.md) |
| SEO/统计/CDN 范围 | 非功能增强 | [08](../.scratch/card-market/issues/08-seo-ops.md) |

---

## 11. 测试与上线检查清单

- [ ] Directus 启动，后台可登录。
- [ ] 各集合 CRUD 在后台可用。
- [ ] 图片上传 → OSS → 前台展示 全链路通过（含自定义域名 HTTPS）。
- [ ] 公开角色无法读取 `messages`、无法写其他集合。
- [ ] 访客留言成功写入并进入后台待处理。
- [ ] 前台：已下架卡牌不展示；banner 按 Directus status（published）显示；公告按 status=published 且 `published_at<=now` 显示（含定时发布与手动 archived 不展示）。
- [ ] 审核信息页：公共 footer 常驻四个入口（运营信息 / 个人信息收集 / 利用规则 / 数据使用），顺序与界面语言一致；`/info/<key>` 三语均 200 且渲染后台正文；未登记 key 404（见 §4.6.1）。
- [ ] 移动端/桌面端响应式正常。
- [ ] 多语言：`/`、`/ja`、`/en` 三语首屏文案与 `<html lang>` 正确；未知语言段 404；语言切换保留当前路径与筛选态；`node scripts/check-i18n.mjs` 全绿（见 §7.2）。
- [ ] 部署：域名 HTTPS、反向代理、数据库备份、基础监控就绪。
- [ ] 提供部署与后台使用说明文档。

---

## 参考

- `docs/requirements.md` — 配套需求文档。
- `spec.md` — 原始需求草稿。
- `.scratch/card-market/map.md` 与 `issues/` — wayfinder 决策地图与 ticket。
- Directus Files / Storage 文档（s3 驱动、FORCE_PATH_STYLE）。
- 阿里云 OSS 文档（Endpoint、自定义域名 CNAME、2025-03 外网域名约束）。
