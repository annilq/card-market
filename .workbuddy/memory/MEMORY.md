# card-market 项目长期约定

## 技术栈与运行
- 前端：TanStack Start（SSR）+ React，`src/routes/*`、`src/lib/directus.ts`（公开角色直连 Directus REST）。
- 后端：Directus 11（容器 `cardmarket-directus`，:8055）+ 本机原生 PostgreSQL（:5432, directus/directus）。
- 开发：`npm run dev` → :3000（与 prod 同端口，二者不要同时起）；生产：`npm run build` + `node prod-server.mjs` → :3000。
- **改完前端必须 `vite build` 后重启 prod 进程**：运行中的进程在启动时缓存了
  `dist/server/assets/router-*.js` 的 chunk 清单；构建会用新哈希重写并清空旧文件，
  旧进程随后 SSR 动态 import 旧哈希会报 `ERR_MODULE_NOT_FOUND`（页面 500/流中断）。
  同理 `dist` 被删空时进程仍会「已启动」但所有路由失败，务必先确认 `dist/server/assets` 非空再启动。
- 数据模型脚本：`npm run directus:bootstrap`（幂等，含集合/字段/关系/索引/权限/语言）、`npm run directus:seed`（有数据则跳过）。
- 后台账号：admin@example.com / admin12345。

## 数据模型约定（易踩坑）
- **M2O 关联字段必须用 `interface: 'select-dropdown-m2o'`**（+ `options.template: '{{name}}'`）。
  `relational` 只是 display，误当 interface 会让后台退化成手输主键。
- **`/relations` 端点忽略 filter**（总返回全量），判断关系是否存在必须直查 `directus_relations`
  （many_collection + many_field），否则关系永远建不出来。
- **`cards.images` 是 M2M**：关联表 `cards_images`（cards_id / directus_files_id / sort），
  `cards.images` 是 `type: alias` + `special: ['m2m']` + `interface: 'list-m2m'`。
  Directus 的 Files 接口 `types: ['alias']`，不能挂在真实 json 列上。
- **M2M 建表顺序不可颠倒**：建关联表 → 迁移旧数据 → 删旧 json 列 → 建两条 relations → 建 alias 字段。
  顺序错了会出现「同名字段返回两条」或 `column cards.images does not exist`。
- 文件字段（banners.image / site_settings.logo）列类型必须是 `uuid`（与 directus_files.id 一致），
  改类型需先 `DROP DEFAULT` 再 `USING col::uuid`。
- 必填外键 `on_delete` 用 `NO ACTION`；可空用 `SET NULL`。
- Public 读 `cards.images` 需要额外授予 `cards_images` 的 read（cards_id/directus_files_id/sort）。
- `cards.date_created/date_updated` 由 DB 列默认值 `now()` + BEFORE UPDATE 触发器维护
  （Directus 对后期新增的 special 字段不会自动写）；`user_created` 保持可空、手工回填。

## 后台本地化
- `directus_settings.default_language = 'zh-CN'`；管理员账号 language 同为 zh-CN。
- 集合中文名写在 `collections[].label`；日文名在 `COLLECTION_LABELS_JA` / `FIELD_LABELS_JA`
  （bootstrap.mjs），由 `buildTranslations()` 生成 `meta.translations`（zh-CN + ja-JP）。
- 新增字段后 bootstrap 会打印缺失日文标签的清单（`checkTranslationCoverage`）。
- `select-dropdown` 的 choices 文本是固定字符串，不随界面语言切换（如需多语言选项要改数据模型）。

## 界面多语言（i18n，易踩坑）
- 语言是 URL 的**可选第一段**：`/cards`（中文默认，无前缀）、`/ja/cards`、`/en/cards`；未知语言段 404。
  页面文件形如 `src/routes/{-$locale}.cards.index.tsx`，`routeTree.gen.ts` 由构建自动生成（不要手改）。
- 文案在 `src/lib/i18n/messages.ts`：`zh` 是唯一键来源，`ja`/`en` 为 `Record<MessageKey,string>`，
  少翻/多写一条键直接 typecheck 报错。
- 运行时 `useLocale()` 从 pathname 派生（无 Provider、无 locale state），`useT()` 按 locale 缓存。
- **所有 `<Link to>` 必须带 `/{-$locale}` 前缀**：裸 `to="/message"` 会丢语言段；语言段由当前路由自动继承，
  不要传 `params={{locale}}`（无效）。索引路由用 `to="/{-$locale}"`（无尾斜杠，带斜杠是类型错误）。
- 切到默认语言必须 `locale: undefined`，传 `'zh'` 会生成 404 的 `/zh/...`。
- 后台内容里的站内路径（`banners.link`）须过 `localizeHref()` 补前缀。
- 不翻译 Directus 内容（界面语言 ≠ 内容语言）。
- 验收：`node scripts/check-i18n.mjs http://localhost:3000`。

## 前端取图
- `CARD_FIELDS` 请求 `images.directus_files_id`，`normalizeCard()` 归一化为 `string[]`；
  组件层（CardCard / cards.$id）只认 `card.images` 的 id 数组。

## 深色主题 / 样式约定（易踩坑）
- 设计令牌在 `styles.css` 的 `@theme`（bg-surface/text-fg/border-border/bg-accent/text-on-accent 等），
  `html.dark` 覆盖变量；`@custom-variant dark` 以 `html.dark` 类为唯一真相。
- **自定义全局基础样式（html/body/a 等）必须包进 `@layer base`**：Tailwind v4 中 unlayered CSS
  优先级高于 `@layer utilities`，unlayered 的 `a{color:inherit}` 会压过 `.text-on-accent` 等工具类，
  导致强调链接文字与背景同色（隐形）。
- 无闪烁主题脚本**不要**以 `<script dangerouslySetInnerHTML>` 写在 JSX `<head>` 里——React 19 会报
  "script tag in component" 并级联 hydration failed，`suppressHydrationWarning` 压不住；正确做法是
  root route `head()` 返回 `scripts: [{ dangerouslySetInnerHTML: {...} }]` 交给 `<HeadContent />` 渲染。
- `<link rel="icon" href="data:," />` 压掉 favicon 404 控制台报错。

## 公共页 chrome 设计令牌（KoDuckYa 设计稿）
- 品牌红 `--color-brand:#e60012` / `--color-brand-hover:#c50010`；顶栏 `bg-brand text-white`。
- 页脚底色 `--color-footer:#0d0d0d`、主文 `--color-footer-fg:#f5f5f5`、次要 `--color-footer-muted:#a8a8a8`；
  令牌名用 `footer`（非 `footer-bg`），这样 `bg-footer` 才能直接命中。
- 页面灰底 `--color-bg:#ECECEC`（替换原 `#f8fafc`）。
- 顶栏搜索按钮 `--color-search-btn:#e8e8e8` / `--color-search-btn-fg:#333333`（浅灰底深灰字，贴输入框右缘）。
- 页脚左侧 FooterLogo、右侧「帮助中心」链接网格（message + 4 个 info_pages key）；标题走界面语言键 `footerHelpCenter`。

## 审核信息页（info_pages）
- 集合 `info_pages`：`page_key`(唯一索引 uniq_info_pages_page_key) / `title` / `body`(rich) / `sort` / `status`(Directus)。
  Public 角色只读且 `status=published`。四个 key：`operation` / `personal-info` / `terms` / `data-usage`。
- **入口与内容分离**：四个 key 与页脚顺序硬编码在 `src/lib/info-pages.ts`（`INFO_PAGE_KEYS` / `INFO_PAGE_LABEL_KEY` /
  `resolveInfoPageKey`），页脚与路由共用；后台只管 `title` + `body`。审计要求入口必须常在，不能因后台删记录而变空链接。
- 路由 `src/routes/{-$locale}.info.$key.tsx`：`beforeLoad` 用 `resolveInfoPageKey()` 收窄，**未登记 key 404**；
  已登记 key 但后台未发布时 **仍 200** + 「尚未发布」提示（不是 404）。
- 页脚入口文案走**界面语言**（`messages.ts` 的 `infoNavTitle/infoOperation/infoPersonalInfo/infoTerms/infoDataUsage/
  infoPageNotFound`），不取后台 title。「不翻译 Directus 内容」只针对正文与详情页标题。
- 路由 `to="/{-$locale}/info/$key"` + `params={{ key }}`；新路由加完必须 `vite build` 让 `routeTree.gen.ts` 重生成，
  否则 tsc 报 `to` 不在联合类型里。
- seed 的 `seedInfoPages()` 可独立补种（ips 非空时也执行），同 key 已存在则跳过。
- 验收：`scripts/check-i18n.mjs` 已覆盖三语页脚文案/href/顺序 + 三语×四页 200 + 未登记 key 404。
