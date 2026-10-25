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
| 卡牌类别 | 例如宝可梦等 |
| 系列分类 | 例如 MEGA 系列 |
| 卡牌类型 | 根据实际业务定义 |
| 稀有程度 | 根据实际业务定义 |
| 排序 | 控制分类展示顺序 |
| 状态 | 是否启用 |

**分类层级与字段枚举待定**（见 [01-classification-model](../.scratch/card-market/issues/01-classification-model.md)）。

### 3.3 卡牌信息管理（后台 + 前台）

管理员可在后台创建、编辑、查看和下架卡牌信息。初步字段：

| 字段 | 说明 |
| --- | --- |
| 卡牌名称 | 卡牌展示名称 |
| 所属类别 | 关联卡牌类别 |
| 所属系列 | 关联系列分类 |
| 卡牌类型 | 卡牌类型或其他业务分类 |
| 回购类型 | 卡牌对应的回购方式或规则 |
| 卡牌状态 | 例如裸卡、有包装等 |
| 稀有程度 | 卡牌稀有等级 |
| 商品图片 | 支持上传和管理图片 |
| 商品描述 | 卡牌介绍及相关说明 |
| 价格 | 卡片价格 |
| 是否高价买取 | 是否高价买取 |
| 展示状态 | 上架、下架 |
| 排序 | 控制列表展示顺序 |
| 创建及更新时间 | 后台记录和维护 |

字段类型、选项与必填规则以最终确认的业务规则为准（见 [02-card-fields](../.scratch/card-market/issues/02-card-fields.md)）。

**前台展示功能：**

- 卡牌列表。
- 卡牌详情。
- 按分类筛选卡牌。
- 展示卡牌图片、描述及回购相关信息。
- 隐藏已下架卡牌。
- 按需支持分页和排序。

是否提供关键词搜索、价格区间筛选、多图片展示等，见 [03-frontend-search-filter](../.scratch/card-market/issues/03-frontend-search-filter.md)。

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
- 设置跳转链接。
- 设置展示位置。
- 控制启用或停用。
- 调整展示顺序。

前台按配置展示 banner，支持图片轮播及链接跳转。是否设置开始/结束时间、是否需要多 banner 位，见 [05-banner-capabilities](../.scratch/card-market/issues/05-banner-capabilities.md)。

### 3.6 公告管理（后台 + 前台）

管理员发布和维护网站公告：

- 新增、编辑和删除公告。
- 设置标题及正文。
- 支持富文本内容。
- 控制发布状态。
- 设置发布时间。
- 设置排序。

前台展示公告入口及详情。是否需要置顶、定时发布、历史归档，见 [06-announcement-capabilities](../.scratch/card-market/issues/06-announcement-capabilities.md)。

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

### 3.8 留言管理（前台 + 后台）

**前台：**

- 提交留言内容。
- 填写必要的联系信息。
- 提交成功后显示反馈信息。
- 对输入内容进行基本校验。

**后台：**

- 查看留言列表。
- 查看留言详情。
- 记录提交时间。
- 标记处理状态。
- 按需删除或归档。

是否要求访客登录、是否需要验证码/防滥用/邮件通知，见 [07-message-anti-abuse](../.scratch/card-market/issues/07-message-anti-abuse.md)。

### 3.9 后台用户与权限管理

使用 Directus 提供的后台用户、角色和权限能力：

- 管理员登录后台。
- 按角色控制后台访问权限。
- 限制不同角色可查看/修改的数据。
- 仅授权人员可维护网站内容。

初期可仅配置单一管理员角色，不必开发复杂用户体系。

---

## 4. 数据实体与字段草案

以下为初步数据模型草案（落地前需结合第 9 节决策 ticket 收敛）。Directus collections：

| 集合（Collection） | 用途 | 关键字段（草案） |
| --- | --- | --- |
| `categories` | 卡牌分类 | id, name, dimension(类别/系列/类型/稀有度?), parent(多层?), sort, status |
| `cards` | 卡牌信息 | id, name, category_id, series_id, card_type, buyback_type, card_status, rarity, images(M2M→files), description, price, is_high_value, display_status, sort, created/updated |
| `banners` | 广告位 | id, title, description, image(fk→files), link, position, status, sort, start_time?, end_time? |
| `announcements` | 公告 | id, title, body(rich), status, published_at, sort, is_pinned? |
| `messages` | 访客留言 | id, content, contact_name?, contact_info?, created_at, status(新/已处理) |
| `site_settings` | 网站基本信息 | site_name, logo, intro, x_account, shop_address, contact_phone, contact_email, business_hours, data_notice, privacy_policy |
| `directus_files` | 图片文件（内置） | 由 Directus 管理，存海外对象存储或本地 |
| `directus_roles` / `directus_users` | 后台权限（内置） | 复用 |

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
- 留言提交接口需要基本输入校验和防滥用措施。
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
- [ ] 移动端与桌面端布局正常。
- [ ] 提供部署与后台使用说明。

> 具体通过/失败阈值随第 9 节决策落地后细化。

---

## 9. 待确认决策清单（Open Decisions）

下列决策挂起为 wayfinder ticket，需逐张 grilling / research 后回填本文档。按名引用：

| # | 决策主题 | 类型 | 对应 ticket | 主要影响 |
| --- | --- | --- | --- | --- |
| 1 | 卡牌分类层级与字段枚举建模 | grilling | [01-classification-model](../.scratch/card-market/issues/01-classification-model.md) | `categories`/`cards` 结构、前台筛选 |
| 2 | 卡牌信息字段定义、选项与必填 | grilling | [02-card-fields](../.scratch/card-market/issues/02-card-fields.md) | `cards` 字段、价格/回购语义 |
| 3 | 前台检索与筛选范围 | grilling | [03-frontend-search-filter](../.scratch/card-market/issues/03-frontend-search-filter.md) | 前端交互、API 查询参数 |
| 4 | 图片存储与 Directus 集成方案（已定方向：海外 S3 兼容 或 Directus 本地） | research | [04-oss-integration](../.scratch/card-market/issues/04-oss-integration.md) | 存储选型、多区域(JP/US)访问 |
| 5 | banner 时间控制与多 banner 位 | grilling | [05-banner-capabilities](../.scratch/card-market/issues/05-banner-capabilities.md) | `banners` 模型、轮播逻辑 |
| 6 | 公告置顶/定时/归档 | grilling | [06-announcement-capabilities](../.scratch/card-market/issues/06-announcement-capabilities.md) | `announcements` 模型 |
| 7 | 留言防滥用策略 | grilling | [07-message-anti-abuse](../.scratch/card-market/issues/07-message-anti-abuse.md) | 留言接口安全、`messages` 模型 |
| 8 | SEO/统计/CDN/图片优化范围 | grilling | [08-seo-ops](../.scratch/card-market/issues/08-seo-ops.md) | 非功能增强范围 |
| 9 | 部署环境与技术栈落定 | task | [09-deployment](../.scratch/card-market/issues/09-deployment.md) | 上线基石 |

---

## 10. 参考

- `spec.md` — 原始初步需求草稿（本文件整理来源）。
- `.scratch/card-market/map.md` — wayfinder 决策地图（destination / 已定决策 / 开放决策 / 范围）。
- `.scratch/card-market/issues/*` — 各决策 ticket 详情。
