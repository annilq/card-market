# 审核信息页：运营信息 / 个人信息收集 / 利用规则 / 数据使用

Type: task
Status: resolved
Blocked by:

## Question

网站审核要求提供四类信息页并在**公共 footer** 给出入口：

1. 运营信息
2. 个人信息收集
3. 利用规则
4. 数据使用

需要决定：内容存放在哪、页面标识怎么定、footer 入口的文案与顺序由谁负责、后台未录入时入口是否还能点。

## Answer

### 数据模型：新增 `info_pages` 集合

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `page_key` | string（唯一索引 `uniq_info_pages_page_key`） | `operation` / `personal-info` / `terms` / `data-usage` |
| `title` | string | 后台可改的标题（详情页 `<h1>`） |
| `body` | rich text (`input-rich-text-md`) | 正文，渲染方式与公告一致 |
| `sort` | integer | 后台排序（页脚顺序**不**依赖它） |
| `status` | Directus 内置 status | draft / published / archived |

Public 角色授予 `read`，带 `status=published` 过滤；无 create/update/delete。

### 职责分离：前端固定入口，后台只管内容

- 四个 key 与顺序硬编码在 `src/lib/info-pages.ts`（`INFO_PAGE_KEYS`），页脚与路由共用同一份清单。
  理由：审计要求这四个入口**必须存在且顺序固定**，不能因为后台误删一条记录或把 status 改回 draft 就变成空链接。
- 后台负责 `title` + `body`（内容可变），前端负责入口、顺序、页面框架。

### 路由：`/info/$key`（挂在 `{-$locale}` 下，天然三语）

- `/info/operation`、`/ja/info/personal-info`、`/en/info/data-usage` 等均可用。
- `beforeLoad` 用 `resolveInfoPageKey()` 收窄标识：**未登记 key 直接 404**（`/info/bogus`），
  避免任意路径段被当成信息页渲染。
- **已登记 key 但后台未发布**时不 404，而是 200 + 「尚未发布」提示——保证审核入口始终能落到有效页面。

### footer 入口：文案走界面语言，不取后台 title

页脚新增一行 `nav`（`aria-label` = 界面语言的「网站信息」），四个 `<Link>` 顺序固定：

| key | zh | ja | en |
| --- | --- | --- | --- |
| `operation` | 运营信息 | 運営情報 | Operations |
| `personal-info` | 个人信息收集 | 個人情報の収集 | Personal data we collect |
| `terms` | 利用规则 | 利用規約 | Terms of use |
| `data-usage` | 数据使用 | データの利用 | How we use data |

文案键在 `src/lib/i18n/messages.ts`（`infoNavTitle` / `infoOperation` / `infoPersonalInfo` / `infoTerms` / `infoDataUsage` / `infoPageNotFound`）。
「不翻译 Directus 内容」的边界**只针对正文与详情页标题**；页脚链接文字属于界面 chrome，与头部导航一致按界面语言渲染。

### 种子数据

`directus/seed.mjs` 新增 `seedInfoPages()`：可独立补种（即便 `ips` 非空也执行），已存在同 `page_key` 则跳过。
四页正文为占位但结构完整的条款文案（各含 3–4 个 `<h2>` 小节），后台可直接改。

### 验收

`scripts/check-i18n.mjs` 新增断言（全部通过）：

- 三种语言下页脚四个入口的文案与 `href`（含语言前缀）
- 入口在 HTML 中的出现顺序与 `INFO_PAGE_KEYS` 一致
- 三语 × 四页 `/info/<key>` 均 200
- `/info/bogus`、`/ja/info/bogus`、`/en/info/nope` 均 404

另：`npx tsc --noEmit` 通过；Directus `/fields/info_pages` 的中日双语标签齐全；
匿名 `GET /items/info_pages?filter[page_key][_eq]=terms` 返回 200（Public 权限生效）。
