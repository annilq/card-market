# 前端界面多语言（i18n）

Type: task
Status: resolved
Blocked by:

## Question

前端界面文案目前全部硬编码简体中文，站内链接与 SEO 元信息也假定单一语言。项目面向日本/美国访问（`docs/development.md` 第 5 节、店铺均在东京），后台已内置 zh-CN / ja-JP 的集合与字段翻译，但**前台界面**没有任何语言切换能力。需要决定：语言范围、URL 形态、文案组织方式、语言切换与 SEO 处理。

## Answer

### 语言范围

`zh`（默认）/ `ja` / `en`。理由是后台既有 zh-CN + ja-JP 标签、店铺在日本，日语是刚性需求；英语覆盖美国访客。语言注册表集中在 `src/lib/i18n/locales.ts`，新增语言只需加一行 + 补齐一份 `Record<MessageKey, string>`。

### URL 形态：可选路径段，默认语言不带前缀

- `/cards`、`/cards/1` → 简体中文
- `/ja/cards`、`/en/cards/1` → 日语 / 英语
- 未知语言段（`/foo`、`/de/cards`）→ **404**，不静默降级

实现为 `src/routes/{-$locale}.tsx` 布局路由（TanStack Router 可选路径段），全部页面挂在它下面。选择理由与实测依据：

| 方案 | 结果 |
| --- | --- |
| 可选路径段（选中） | `/`、`/ja`、`/ja/cards/7` 匹配正确；`buildLocation` 生成干净 href；语言段随当前路由自动继承，站内链接只需把 `to` 加上 `/{-$locale}` 前缀 |
| `router.rewrite` 剥/加前缀 | 否决。语言状态无处安放：`rewrite.input` 丢弃后 `router.state.location.pathname` 只剩 `/cards`，`buildLocation` 在 `/ja/cards` 页面上产出 `/cards/7`；且 `matchRoutes` 绕过 rewrite |
| 仅 cookie / 仅 localStorage | 否决。无法分享特定语言页面、无 hreflang、SSR 首屏无法按语言渲染 |
| 根路径 302 到 `/zh` | 否决。会让默认语言 URL 多一跳，且既有链接全部失效 |

### 文案组织：手写类型化字典，零运行时依赖

`src/lib/i18n/messages.ts`：`zh` 是唯一键来源，`MessageKey = keyof typeof zh`；`ja` / `en` 声明为 `Record<MessageKey, string>`，因此**少翻一条或多写一条键都在 typecheck 阶段报错**，不需要额外一致性脚本。`translate()` 支持 `{name}` 插值，缺键回退 zh 再回退键名。

未引入 i18next / paraglide：本项目的文案量约 100 条、无复数与 RTL 需求、已有 SSR 首屏要求，引入编译插件或运行时库会新增构建步骤与 hydration 边界，收益不抵成本。日期用原生 `Intl.DateTimeFormat`。

### 运行时取值：从 URL 派生，不维护第二份状态

`useLocale()` 从当前 pathname 首段解析（`resolveLocaleParam`），`useT()` 按 locale 返回稳定引用。没有 Provider、没有 locale state，因此 SSR 与客户端读到的值必然一致（实测无 hydration 警告）。

### 站内链接

所有 `to="..."` 加 `/{-$locale}` 前缀；语言段由当前路由继承，不需要显式传 `params={{ locale }}`（显式传会被忽略：裸 `to` 不因 params 长出语言段，实测 `/message` 仍是 `/message`）。

后台内容里的站内路径（如 `banners.link` = `/cards?ip=1`）绕过路由类型系统，由 `localizeHref()` 在边界补齐，否则从日语页点 banner 会掉回中文。

### 语言切换

`__root.tsx` 的 `LocaleSwitcher`：相对路由 `to: '.'` + `params` reducer + `search: true`，保留当前路径、路径参数与查询串（筛选态不丢）。切到默认语言时传 `locale: undefined` 让可选段整体消失——传 `'zh'` 会生成 `/zh/...` 而那是未知语言段。

### SEO

- `<html lang>` 按当前语言输出（zh-CN / ja-JP / en）
- 每语言独立 `<title>` 与 `description`（写在 `LOCALES` 注册表）
- `hreflang` 交替链接指向**当前页**的各语言等价位址（`pathForLocale`），含 `x-default`
- 不翻译 Directus 内容：卡名、公告正文、店铺地址等按后台原样输出。**这是有意的边界**：界面语言 ≠ 内容语言，内容多语言是 Directus 的职责（后台已支持字段翻译），不在本次范围

### 验收

`node scripts/check-i18n.mjs http://localhost:3000`（68 项断言）：三语首屏 SSR 文案、`<html lang>`、所有页面可达、未知语言段 404、hreflang、banner 链接补前缀、内容不被翻译。另用真实 Chrome（CDP）验证语言切换交互与零 hydration 错误。

### 已知边界（有意不处理）

- **内容语言与界面语言可能不一致**：日语界面下卡牌名仍是中文（内容未翻译）。这是内容侧的翻译工作，不是界面缺陷。
- 语言偏好不做持久化/自动协商（`Accept-Language` 重定向）：默认语言固定在 `/`，避免同一 URL 因客户端差异返回不同语言，破坏 CDN 缓存与可分享性。
