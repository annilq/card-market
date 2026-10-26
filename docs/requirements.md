# 卡牌展示与回购信息网站 — 项目需求文档

> 本文档基于仓库根目录 `spec.md`（初步需求草稿）整理而成。整理时修正了原稿中"首页"被重复写为 3.1/3.2、以及后续小节编号错位的问题，并把原稿中所有"待确认"项集中收敛为统一的**待确认决策清单**（第 9 节），对应 wayfinder 决策地图 `.scratch/card-market/map.md` 与 `issues/` 下的各决策 ticket。
>
> 文档状态：**决策就绪草稿**。已定决策直接落地；开放决策以 ticket 形式挂起，待逐张 grilling 后回填。

---

## 0. 文档结构说明

| 章节 | 内容 |
| --- | --- |
| 1. 项目概述 | 目标、定位、非目标 |
| 2. 用户角色与权限 | 访客、管理员 |
| 3. 功能需求 | 首页 / 分类 / 卡牌 / 图片 / banner / 公告 / 网站信息 / 留言 / 后台权限 |
| 4. 数据实体与字段草案 | 各业务对象字段表 |
| 5. 非功能需求 | 兼容 / 安全 / 可维护 / SEO 与性能 |
| 6. 技术方案（已定） | 分层选型与原则 |
| 7. 交付范围 | 初步交付物清单 |
| 8. 验收标准（草案） | 可量化验收点 |
| 9. 待确认决策清单 | 开放决策 + 对应 ticket |
| 10. 参考 | 关联文件 |

---

## 1. 项目概述

### 1.1 项目目标

建设一个面向卡牌爱好者的**展示与回购信息网站**，用于展示卡牌商品、卡牌分类、回购条件、店铺信息及相关公告。管理员通过后台维护商品、图片、广告、公告和访客留言，**无需直接修改代码**即可维护日常网站内容。

### 1.2 项目定位

本项目属于**内容展示型网站**，不属于完整电商平台。核心价值是"展示 + 回购信息 + 公告/店铺触达 + 访客留言"，而非在线交易。

### 1.3 非目标（明确不做）

依据范围边界 ticket [00-scope](../.scratch/card-market/issues/00-scope.md)，以下能力**明确不在本次交付内**：

- 购物车与在线下单
- 在线支付
- 订单及物流管理
- 库存交易系统
- 复杂会员体系

任何超出"内容展示 + 回购信息"定位的交易闭环均排除在外。

---

## 2. 用户角色与权限

### 2.1 访客（公开）

- 浏览首页及卡牌信息。
- 按分类查看卡牌。
- 查看卡牌详情、图片及回购信息。
- 查看网站公告、店铺信息及联系方式。
- 查看广告/banner 内容并跳转至指定链接。
- 提交留言或咨询。

### 2.2 管理员

- 登录网站管理后台（Directus）。
- 管理卡牌及分类信息。
- 管理商品图片 / banner 图片。
- 管理广告（banner）、公告及网站基本信息。
- 查看、处理访客留言。
- 根据需要管理后台用户及权限（复用 Directus 内置角色）。

> 若初期仅一名管理员，可采用简单管理员权限配置，不必开发复杂用户体系。

---

## 3. 功能需求

### 3.1 首页

展示网站主要内容，包括：

- 网站名称、Logo，全局卡片搜索输入框，X 账号连接，shop（店铺地址链接）。
- 重点推荐的卡牌或商品。
- 广告/banner 轮播区域。
- 最新公告入口。
- 卡牌分类入口。
- 店铺信息及联系方式。
- 其他介绍内容。

具体首页布局与展示模块在 UI 设计阶段确定。

### 3.2 卡牌分类管理（后台）

管理员在后台维护卡牌分类。初步考虑的分类维度：

| 字段 | 说明 |
| --- | --- |
| IP 维度（卡牌类别） | 动态维度集合 `ips`（多 IP 集市：宝可梦 / 游戏王 / 龙珠 …），即大类 |
| 系列分类 | IP 子级 `series`，三层结构：IP → 系列 → 子系列（如 宝可梦 → MEGA → [M6a]） |
| 子系列 | 系列子级 `sub_series`，**必填**（仅两层 IP 也须建空壳占位） |
| 稀有程度 | 独立维度集合 `rarities`，`cards` 经关系引用（全局单一枚举，后台配置） |
| 排序 | 各维度自身的展示顺序字段（facet 排序，非分类维度）；`cards` 不设 sort |
| 状态 | 维度「是否启用」；卡牌生命周期用 Directus 内置 status（draft/published/archived），不计入分类维度 |

> 分类层级与字段枚举**已定**（见 [01-classification-model](../.scratch/card-market/issues/01-classification-model.md)）：多 IP 集市、三层 IP→系列→子系列（sub_series 必填）、稀有程度为独立维度集合 + 关系、卡牌类型(card_types)已删除、`ips`/`series`/`sub_series`/`rarities` 四个维度均后台配置化。

### 3.3 卡牌信息管理（后台 + 前台）

管理员可在后台创建、编辑、查看和下架卡牌信息。初步字段：

| 字段 | 说明 | 必填 |
| --- | --- | --- |
| 卡牌名称 | 卡牌展示名称 | 始终 |
| 所属 IP（类别） | 关联 IP 维度（ips，后台配置） | 始终 |
| 所属系列 | 关联系列分类（series） | 始终 |
| 子系列 | 关联子系列（sub_series，必填） | 始终 |
| 编号 | 卡牌收藏编号，如 `123/197` / `SWSH01-025` | 上架必填 |
| 稀有程度 | 关联稀有程度维度（rarities，后台配置） | 始终 |
| 商品图片 | 支持上传和管理图片 | 上架≥1 |
| 商品描述 | 卡牌介绍及相关说明 | 可选 |
| 价格 | 卡片卖价（仅卖价，不含买取价/估值） | 上架必填 |
| 是否高价买取 | **纯标识**：运营自由标注、无统一标准，仅「只看精品」筛选 | 可选（默认 false） |
| 卡牌状态 | 裸卡 / 有包装（代码常量） | 始终（默认 裸卡） |
| 生命周期状态 | Directus 内置 status：草稿/上架/下架归档 | 系统 |
| 创建及更新时间 | 后台记录和维护 | 系统 |

> 删除项：卡牌类型(card_types)、回购类型（与 IP 维度重复）、展示状态（改用 Directus 内置 status）、排序（列表纯 price DESC）。列表默认按价格降序；`is_high_value` 不影响排序。

字段类型、选项与必填规则以最终确认的业务规则为准（见 [02-card-fields](../.scratch/card-market/issues/02-card-fields.md)，已 resolved）。

**前台展示功能：**

- 卡牌列表。
- 卡牌详情。
- 按分类筛选卡牌。
- 展示卡牌图片、描述及回购相关信息。
- 隐藏已下架卡牌。
- 按需支持分页和排序。

检索与筛选范围**已定**（见 [03-frontend-search-filter](../.scratch/card-market/issues/03-frontend-search-filter.md)，已 resolved）：首页/列表页支持 卡名+编号 关键词搜索、IP→系列→子系列 级联筛选、稀有程度多选过滤、价格区间、只看精品，排序为 价格升降 + 最新上架，分页且过滤态进 URL；多图片画廊属详情页。

### 3.4 图片管理及 OSS 存储（后台 + 前台）

商品图片和广告图片统一通过后台上传和管理：

- 后台上传、查看和替换图片。
- 图片关联到对应卡牌或 banner。
- 前台正常展示图片。
- 图片存储：海外 S3 兼容对象存储，或 Directus 本地文件管理（见 [04-oss-integration](../.scratch/card-market/issues/04-oss-integration.md)）。
- 配置图片访问权限及访问地址。
- 部署后验证上传、读取和展示流程。

技术方案（见 [04-oss-integration](../.scratch/card-market/issues/04-oss-integration.md)）：

- 使用 Directus 内置文件管理能力。
- 使用 Directus 内置文件管理能力；图片存储二选一：① 海外 S3 兼容对象存储（Cloudflare R2 / AWS S3 / DigitalOcean Spaces 等，Directus `s3` 驱动直连，无国内兼容坑）；② Directus 本地文件管理（最简，适合单服务器 MVP）。详见 `docs/development.md` 第 5 节。

### 3.5 banner 管理（后台 + 前台）

管理员维护网站 banner：

- 新增、编辑和删除 banner。
- 上传 banner 图片。
- 设置标题及描述。
- 设置跳转链接（内部路由或外部 URL）。
- 调整展示顺序（单槽位轮播顺序）。
- 通过 Directus 内置 status（draft/published/archived）控制上下线。

前台按配置展示 banner，支持图片轮播（自动播放 + 固定切换间隔，前端常量）及链接跳转。

> banner 能力**已定**（见 [05-banner-capabilities](../.scratch/card-market/issues/05-banner-capabilities.md)，已 resolved）：**单槽位**（仅首页顶部轮播，无多 position）、**无定时上下线**（仅靠 status）、**轮播策略前端硬编码**；status 统一复用 Directus 内置 status，删除原 boolean 启用/停用。`link` 内/外链安全与图片宽高比为实现期次要项。

### 3.6 公告管理（后台 + 前台）

管理员发布和维护网站公告：

- 新增、编辑和删除公告。
- 设置标题及富文本正文。
- 通过 Directus 内置 status（draft/published/archived）控制发布与归档。
- 设置发布时间（未来时间 = 定时发布，留空 = 发布即展示）。
- 支持置顶（`is_pinned`）公告。
- 可选手动排序（`sort`）作为组内 tie-break。

前台公告列表：可见 = `status=published 且 published_at<=now`；排序 = 置顶组在前、组内按 `published_at` 倒序；`archived` 公告不展示。

> 公告能力**已定**（见 [06-announcement-capabilities](../.scratch/card-market/issues/06-announcement-capabilities.md)，已 resolved）：status 统一复用 Directus 内置 status、需要置顶、需要定时发布、手动归档（无自动过期）。`body` 富文本渲染需防 XSS。

### 3.7 网站基本信息管理（后台）

后台维护网站相关信息，避免每次修改都改代码：

| 信息类别 | 内容示例 |
| --- | --- |
| 网站信息 | 网站名称、Logo、简介 |
| 社交媒体 | X 账号地址 |
| 店铺信息 | 店铺介绍、地址等 |
| 联系方式 | 联系电话、邮箱等 |
| 运营信息 | 营业时间、运营说明等 |
| 个人信息收集说明 | 网站收集信息的用途及说明 |
| 隐私协议 | 网站隐私政策内容 |

实际字段根据业务情况确定。

#### 3.7.1 审核信息页（合规四页）— 已落地

为满足网站审核要求，后台需提供四类**独立、可维护、可公开访问**的信息页，并在**全站公共 footer** 提供固定入口：

| # | 页面 | 内容职责 | 前端路由 |
| --- | --- | --- | --- |
| 1 | 运营信息 | 运营主体、客服联系方式、免责声明 | `/info/operation` |
| 2 | 个人信息收集 | 收集范围、收集目的、保存与删除方式 | `/info/personal-info` |
| 3 | 利用规则 | 网站使用规则、内容权利、禁止行为、规则变更 | `/info/terms` |
| 4 | 数据使用 | 数据用途、Cookie/本地存储、数据安全 | `/info/data-usage` |

约束（已定）：

- 四个入口顺序固定、**常驻 footer**，与界面语言一致（zh / ja / en 各自翻译入口文案），链接带当前语言前缀。
- 正文由后台维护（Directus `info_pages` 集合，字段 `page_key / title / body / sort / status`），前台不硬编码正文。
- 审核入口**必须始终可点**：后台未录入或未发布时，页面仍返回 200 并提示「尚未发布」，只有**未登记的标识**才 404。
- 已发布内容才可被公开角色读取（`status=published`），与 cards/banners/announcements 一致。

> 实现细节与字段表见 `docs/development.md` §4.6.1。

### 3.8 留言管理（前台 + 后台）

**前台：**

- 提交留言内容（必填）。
- 联系信息（联系人 / 联系方式）**选填**，降低提交门槛。
- 提交成功后显示反馈信息。
- 对输入内容进行基本校验（长度等）。
- **不要求登录**、**无验证码**。

**后台：**

- 查看留言列表（仅管理员可见，公开不可读）。
- 查看留言详情与提交时间。
- 标记处理状态：新 / 已处理 / 已归档 / **已标记垃圾**（垃圾由管理员手动判定，无自动检测）。
- 按需删除或归档。
- 通知方式：**仅站内**（管理员登录 Directus 后台可见 `status=新`），无邮件通知。

> 留言防滥用**已定**（见 [07-message-anti-abuse](../.scratch/card-market/issues/07-message-anti-abuse.md)，已 resolved）：直连 Directus public create（零自定义后端）；防滥用仅边缘限流（Cloudflare/Nginx）+ 字段校验，不引验证码/频率限制/内容审核/蜜罐；仅站内通知；联系方式全可选；垃圾留言手动置 `已标记垃圾`。

### 3.9 后台用户与权限管理

使用 Directus 提供的后台用户、角色和权限能力：

- 管理员登录后台。
- 按角色控制后台访问权限。
- 限制不同角色可查看/修改的数据。
- 仅授权人员可维护网站内容。

初期可仅配置单一管理员角色，不必开发复杂用户体系。

---

## 4. 数据实体与字段草案

以下为数据模型（分类维度与卡牌字段已定稿，见 [01](../.scratch/card-market/issues/01-classification-model.md)/[02](../.scratch/card-market/issues/02-card-fields.md)；banner/公告/留言能力亦已决议，见 [05](../.scratch/card-market/issues/05-banner-capabilities.md)/[06](../.scratch/card-market/issues/06-announcement-capabilities.md)/[07](../.scratch/card-market/issues/07-message-anti-abuse.md)）。Directus collections：

| 集合（Collection） | 用途 | 关键字段（草案） |
| --- | --- | --- |
| `ips` | IP 维度 / 卡牌类别 / 大类 | id, name, sort, status |
| `series` | 系列分类（IP 子级，三层：IP→系列→子系列） | id, name, ip_id→ips, sort, status |
| `sub_series` | 子系列（系列子级，必填） | id, name, series_id→series, sort, status |
| `rarities` | 稀有程度维度（全局单一枚举，后台配置） | id, name, sort, status |
| `cards` | 卡牌信息 | id, name, ip_id→ips, series_id→series, sub_series_id→sub_series, code, rarity_id→rarities, price, images(M2M→files), description, is_high_value, card_status, status(Directus 内置), created/updated |
| `banners` | 广告位（单槽位首页轮播） | id, title, description, image(fk→files), link, sort, status(Directus 内置) |
| `announcements` | 公告 | id, title, body(rich), published_at, is_pinned, sort, status(Directus 内置) |
| `messages` | 访客留言 | id, content, contact_name?(可选), contact_info?(可选), created_at, status(新/已处理/已归档/已标记垃圾，自定义枚举非 Directus) |
| `site_settings` | 网站基本信息 | site_name, logo, intro, x_account, contact_email, data_notice, privacy_policy |
| `info_pages` | 审核信息页（运营信息 / 个人信息收集 / 利用规则 / 数据使用） | id, page_key(唯一), title, body(rich), sort, status(Directus 内置) |
| `directus_files` | 图片文件（内置） | 由 Directus 管理，存海外对象存储或本地 |
| `directus_roles` / `directus_users` | 后台权限（内置） | 复用 |

> 字段带 `?` 者为待确认项（见第 9 节 ticket）。分类维度与卡牌字段已定（见 [01](../.scratch/card-market/issues/01-classification-model.md)/[02](../.scratch/card-market/issues/02-card-fields.md)），`cards` 已移除 card_types/buyback_type/display_status/sort。

> 字段带 `?` 者为待确认项，对应第 9 节 ticket。

---

## 5. 非功能需求

### 5.1 兼容性

- 支持常见桌面浏览器。
- 支持手机浏览器访问。
- 页面适配不同屏幕尺寸（响应式）。

### 5.2 安全性

- 后台必须经过身份验证。
- 前台只能访问授权公开的数据。
- 留言提交接口需要基本输入校验和防滥用措施（直连 Directus public create + 边缘限流，不引自定义网关；详见 [07](../.scratch/card-market/issues/07-message-anti-abuse.md)）。
- 敏感配置和 OSS 凭证不得暴露在前端代码中（经 Directus API 代理，前端不直连 OSS 凭证）。

### 5.3 可维护性

- 卡牌、公告、广告等内容可通过后台维护。
- 分类及相关选项尽可能配置化。
- 提供基本部署配置和操作说明。

### 5.4 SEO 与性能

- 基础页面标题及描述配置。
- 对主要内容页面进行基础 SEO 优化。
- 合理处理图片尺寸和加载。
- 按需配置缓存和静态页面生成。

是否需要系统化 SEO、访问统计、CDN 及高级图片优化，见 [08-seo-ops](../.scratch/card-market/issues/08-seo-ops.md)。

---

## 6. 技术方案（已定）

| 层次 | 推荐方案 | 主要职责 |
| --- | --- | --- |
| 前端 | TanStack Start | 网站页面、交互、响应式布局 |
| 内容管理后台 | Directus | 卡牌、分类、广告、公告、留言管理 + 文件管理 + 用户权限 |
| 数据库 | PostgreSQL | 保存业务数据 |
| 图片存储 | 海外对象存储(S3兼容) 或 Directus 本地文件 | 保存商品/广告图片等文件 |
| 前后端通信 | Directus API | 前端读取内容、访客提交留言 |
| 部署环境 | 待定（见 [09-deployment](../.scratch/card-market/issues/09-deployment.md)） | 部署前端、后台和数据库 |

**架构原则：**

- 复用 Directus 已有的内容管理、文件管理、API、用户和权限功能，不重复开发后台 CRUD。
- 重点开发网站前台页面、业务数据模型、后台配置和前后端集成。
- 图片统一经后台管理，存海外对象存储或 Directus 本地文件。
- 按实际访问量确定部署规格，避免初期过度设计。

---

## 7. 交付范围

初步交付物：

1. 网站前台页面。
2. Directus 内容管理后台。
3. PostgreSQL 数据模型及相关配置。
4. 卡牌、分类、广告、公告、留言等业务功能。
5. 图片存储对接及验证（海外对象存储或本地）。
6. 前后端 API 对接。
7. 网站部署及基础配置。
8. 基本功能测试。
9. 部署和后台使用说明。

---

## 8. 验收标准（草案）

- [ ] 访客可浏览首页、卡牌列表与详情，已下架卡牌不在前台出现。
- [ ] 管理员可经后台完成卡牌/分类/banner/公告/网站信息/留言的增删改查。
- [ ] 图片经后台上传、存对象存储或本地、前台可访问（上传/读取/展示全链路验证通过）。
- [ ] 访客留言可提交并进入后台待处理列表。
- [ ] 后台访问受身份认证与角色权限约束；前台仅能读取公开数据。
- [ ] 公共 footer 常驻四个审核信息页入口（运营信息 / 个人信息收集 / 利用规则 / 数据使用），顺序固定且随界面语言；四页正文可由后台维护。
- [ ] 移动端与桌面端布局正常。
- [ ] 提供部署与后台使用说明。

> 具体通过/失败阈值随第 9 节决策落地后细化。

---

## 9. 待确认决策清单（Open Decisions）

下列决策挂起为 wayfinder ticket，需逐张 grilling / research 后回填本文档。按名引用：

| # | 决策主题 | 类型 | 对应 ticket | 主要影响 |
| --- | --- | --- | --- | --- |
| ~~1~~ | ~~卡牌分类层级与字段枚举建模~~ **（已决议）** | grilling | [01-classification-model](../.scratch/card-market/issues/01-classification-model.md) | 多 IP 集市、三层 IP→系列→子系列（sub_series 必填）、稀有程度为独立维度集合+关系；卡牌类型(card_types)已删；`ips`/`series`/`sub_series`/`rarities`/`cards` 结构已定 |
| ~~2~~ | ~~卡牌信息字段定义、选项与必填~~ **（已决议）** | grilling | [02-card-fields](../.scratch/card-market/issues/02-card-fields.md) | `cards` 字段、价格(仅卖价)/回购语义已定：删 card_types/buyback_type/display_status/sort，新增 code，三层 IP→系列→子系列，状态用 Directus 内置 status |
| ~~3~~ | ~~前台检索与筛选范围~~ **（已决议）** | grilling | [03-frontend-search-filter](../.scratch/card-market/issues/03-frontend-search-filter.md) | 级联筛选(IP→系列→子系列)+稀有程度/精品/价格区间 facet+关键词(卡名+编号,pg_trgm)+排序(价格±/最新)+分页URL同步；画廊归详情页 |
| 4 | 图片存储与 Directus 集成方案（已定方向：海外 S3 兼容 或 Directus 本地） | research | [04-oss-integration](../.scratch/card-market/issues/04-oss-integration.md) | 存储选型、多区域(JP/US)访问 |
| ~~5~~ | ~~banner 时间控制与多 banner 位~~ **（已决议）** | grilling | [05-banner-capabilities](../.scratch/card-market/issues/05-banner-capabilities.md) | 单槽位（无 position 枚举）、无定时上下线（仅靠 Directus status）、轮播策略前端硬编码；status 统一复用 Directus 内置 status，`banners` 模型已定 |
| ~~6~~ | ~~公告置顶/定时/归档~~ **（已决议）** | grilling | [06-announcement-capabilities](../.scratch/card-market/issues/06-announcement-capabilities.md) | 统一 Directus status（archived=归档）、需要置顶 is_pinned、需要定时发布（published_at 未来暂不展示）、手动归档无自动过期；`announcements` 模型已定 |
| ~~7~~ | ~~留言防滥用策略~~ **（已决议）** | grilling | [07-message-anti-abuse](../.scratch/card-market/issues/07-message-anti-abuse.md) | 直连 Directus public create（零后端）、边缘限流+字段校验、仅站内通知、联系方式全可选、垃圾留言 `已标记垃圾` 态；`messages` 用自定义 status 枚举（非 Directus） |
| 8 | SEO/统计/CDN/图片优化范围 | grilling | [08-seo-ops](../.scratch/card-market/issues/08-seo-ops.md) | 非功能增强范围 |
| 9 | 部署环境与技术栈落定 | task | [09-deployment](../.scratch/card-market/issues/09-deployment.md) | 上线基石 |

---

## 10. 参考

- `spec.md` — 原始初步需求草稿（本文件整理来源）。
- `.scratch/card-market/map.md` — wayfinder 决策地图（destination / 已定决策 / 开放决策 / 范围）。
- `.scratch/card-market/issues/*` — 各决策 ticket 详情。
