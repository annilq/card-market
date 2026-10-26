# Map: 卡牌展示与回购信息网站 — 需求与开发文档

## Destination

产出一份**决策就绪**的完整项目需求文档与项目开发文档：明确项目范围、已定决策、待确认决策（open decisions）、技术架构、数据模型、前后端集成与部署方案，作为方案选型、工作量评估与开发报价的依据。

## Notes

- 领域：卡牌内容展示 + 回购信息网站（**非电商交易平台**）。
- 本仓库约定：issue 用本地 markdown（`.scratch/<feature>/`）；领域文档单上下文（`GLOSSARY.md` + `docs/adr/`）。
- 既有输入：`spec.md`（初步需求草稿，含多处"待确认"）。本 map 把它整理为决策图，供后续逐张 grilling。
- 每张待确认项都是一张 **decision ticket**（决定，而非实现切片），文中按名引用、链接到 `issues/`。
- 技术栈已初步选定：TanStack Start（前端）/ Directus（后台+API）/ PostgreSQL（库）/ 图片存储为**海外 S3 兼容对象存储 或 Directus 本地文件**（项目部署在日本、美国）。存储选型与部署环境仍有开放项（见对应 ticket）。

## Decisions so far

- [范围边界：内容展示型定位](issues/00-scope.md)：明确排除购物车/支付/订单/物流/库存交易/复杂会员。
- 用户角色：访客（公开浏览+留言）与管理员（后台维护），复用 Directus 内置用户/角色/权限。
- 技术选型：前端 TanStack Start、后台 Directus、数据库 PostgreSQL、图片存储为海外 S3 兼容对象存储或 Directus 本地文件（部署于日本/美国）、前后端经 Directus API 通信。
- 图片统一走后台上传，存海外对象存储或 Directus 本地文件；不重复开发后台 CRUD，复用 Directus。
- [图片存储方案：海外 S3 兼容存储 或 Directus 本地文件](issues/04-oss-integration.md)：弃用阿里云 OSS，按部署规模二选一（R2/S3+CloudFront 或本地文件）。
- [前端界面多语言（i18n）](issues/10-frontend-i18n.md)：可选路径段 `/ja`、`/en`（默认 zh 无前缀），手写类型化字典零依赖，URL 派生 locale，未知语言段 404。
- [审核信息页](issues/11-audit-info-pages.md)：新增 `info_pages` 集合（`page_key/title/body/sort/status`），公共 footer 常驻四个固定入口（运营信息/个人信息收集/利用规则/数据使用），前端固定入口与顺序、后台只管内容；已登记 key 恒 200、未登记 key 404。
- [卡牌分类建模](issues/01-classification-model.md)：多 IP 集市 → 两层 类别→系列；类型/稀有程度为独立维度集合+关系（非 cards 属性列）；四个维度均后台配置化。状态/排序不计入分类。

## Not yet specified

- [卡牌信息字段的最终定义、选项与必填规则](issues/02-card-fields.md)。
- [前台检索与筛选能力范围](issues/03-frontend-search-filter.md)（关键词搜索、价格区间、多图）。
- [banner 是否需要开始/结束时间与多 banner 位](issues/05-banner-capabilities.md)。
- [公告是否需要置顶/定时发布/历史归档](issues/06-announcement-capabilities.md)。
- [留言防滥用策略](issues/07-message-anti-abuse.md)（登录、验证码、邮件通知）。
- [SEO / 访问统计 / CDN / 高级图片优化范围](issues/08-seo-ops.md)。
- [部署环境与技术栈落定](issues/09-deployment.md)（托管、域名、HTTPS、运行时）。

## Out of scope

- 购物车与在线下单、在线支付、订单及物流管理、库存交易系统、复杂会员体系——见 [范围边界](issues/00-scope.md)。
- 任何超出"内容展示 + 回购信息"定位的交易闭环，均不在本次交付内。
