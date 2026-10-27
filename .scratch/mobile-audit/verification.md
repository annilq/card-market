# 移动端布局验收报告（2026-10-27）

> **状态：报告中的 4 个问题已全部修复并复验**（见文末「修复记录」）。
> 下列「问题」章节保留的是修复前的现场与量化数据，用于说明改动理由。

对象：`http://localhost:3000`（生产构建 `npm run build && npm start`，`dist/` 为最新构建）
工具：headless Chrome 156 + CDP（`.scratch/mobile-audit/lib/cdp.mjs`、`lib/probe.js`、`sweep.mjs`）
数据：Directus 实时数据；另用带 `MOBILETEST` 前缀的临时数据压测长文本/分页，**测完已全部删除并核对行数复原**。

## 覆盖范围

7 个视口 × 16 个页面 = 112 次带探针的完整加载，另有菜单展开态与交互验证：

| 视口 | 320 / 360 / 375 / 390 / 430 / 768 / 844×390（横屏） |
| --- | --- |
| 页面 | 首页、卡牌列表、带筛选列表、分页列表、卡牌详情、公告列表、公告详情、店铺、留言、4 个信息页、`/ja/cards`、`/en/cards`、404 |
| 公共区块 | header（logo / 导航 / 搜索 / 语言 / 主题 / 汉堡）、移动端下拉菜单、footer（3 段信息 + 4 个信息页入口 + 版权） |

探针逐页量化：横向溢出（以 `visualViewport.width` 为基准，避免移动端布局视口被内容撑大造成的假阴性）、越界元素及其滚动容器归属、文本截断、小于 24px 的点击目标、header 子元素重叠、footer 栅格列数。

## 结论：两处必须修的移动端布局问题

### 1. 窄屏（< 390px）分页控件撑破页面横向宽度

| 320 | 360 | 375 | 390 | 430 |
| --- | --- | --- | --- | --- |
| **+68px 溢出** | **+28px** | **+13px** | 0 | 0 |

满窗口分页是 9 个 `h-9 min-w-9`（36px）控件 + `gap-1.5`（6px），合计 **372px**；容器可用宽度只有 `视口 − 32px`（320 时 = 288px）。容器是 `flex justify-center` 且子项不换行不收缩，于是整行捅出视口，整个页面出现横向滚动（截图里卡片、footer、信息页入口全部被切）。

- 触发条件：任意语言下的列表页，只要总页数 ≥ 7（窗口 `1 2 3 4 5 … 9`）。
- 证据：`evidence/pagination-320.png`（另有 360/390 的扫描数据，截图未入库）
- 位置：[Pagination.tsx:25-L26](src/components/Pagination.tsx#L25-L26)
- 说明：这不只是分页组件的问题，`main` 是 `mx-auto w-full max-w-6xl px-4`，没有 `overflow-x` 兜底，所以任何一处超宽都会放大成整页横向滚动。

### 2. `< 360px` 时店铺页栅格被 min-content 撑开

| 320 | 360 | 375 | 390 |
| --- | --- | --- | --- |
| **+39px 溢出** | 0 | 0 | 0 |

`grid lg:grid-cols-[minmax(280px,380px)_1fr]` 在窄屏是单列，但两个子项都保留 `min-width: auto`，于是列宽被「店铺行」的 min-content 顶到 **343px**（320 视口下可用 288px）。根源是店铺行里那个 `.truncate` 地址——它的 `min-content` 就是整行地址的宽度，加上图片 96px + gap。

- 证据：`evidence/shops-overflow-320.png`（地图与门店行整体右移、右侧被切）
- 位置：[shops.tsx:74-L92](src/routes/{-$locale}.shops.tsx#L74-L92)，地址截断在 [shops.tsx:44](src/routes/{-$locale}.shops.tsx#L44)
- 已实测确认修法有效：给两个 grid 子项加 `min-w-0`（或把列定义写成 `minmax(0,1fr)`）后列宽从 343px 回落到 288px，溢出归零。

## 严重问题（非布局，但影响所有页面，含 404）

### 3. 404 页整页空白 + 双重文档嵌套

访问任意未匹配路径（`/nope`、`/de/cards`、`/ja/nope`）：

- SSR 返回的 HTML 里 `<html>/<head>/<body>` 各自出现 **2 次**——`main` 内部又套了一层完整文档；
- 客户端水合失败（React #418），`main` 被清空，**页面上只剩 header 和 footer，404 提示与返回入口全部消失**（`evidence/not-found-390.png`）；
- 该页所有站内链接都带着错误路径段：`返回首页 → /nope`、页脚 `/nope/info/operation`，点了仍然 404（死循环）。

原因是根路由的 `notFoundComponent` 与 `errorComponent` 都套了 `<RootDocument>`，而 RootDocument 自己渲染 `<html>`。正常页面走 `RootComponent` → `<RootDocument><Outlet/></RootDocument>`；404/500 是根路由自己渲染，被 RootDocument 又包了一层。

- 位置：[__root.tsx:92](src/routes/__root.tsx#L92)、[__root.tsx:103](src/routes/__root.tsx#L103)、[__root.tsx:131](src/routes/__root.tsx#L131)、[__root.tsx:237](src/routes/__root.tsx#L237)
- 影响面：这是**所有**错误态的兜底页，原本要防止白屏，实际效果是白屏（只剩壳）。

### 4. 深色模式刷新后丢失（无闪烁脚本没进 HTML）

`html` 上的 `dark` 类在首屏同步脚本里正确加上了（已用 `MutationObserver` 抓到时序：`sync: dark`），但 **100ms 内被水合抹掉**，刷新后页面回到浅色而 `localStorage.theme` 仍是 `dark`——用户每次刷新都要重新点。

已用两个实验定位：

| 实验 | 结果 |
| --- | --- |
| 正常加载（会水合） | `html.className === ""` ❌ |
| 屏蔽 `*.js`（不水合） | `className === "dark"`，背景 `rgb(11,17,32)` ✅ |

根因是 `head().scripts` 里用的是 `{ dangerouslySetInnerHTML: { __html } }`，而 TanStack Router 的 `HeadContent` 只认 `{ children: string }`，于是 SSR 输出一个**空的 inline `<script></script>`**（已确认 HTML 中 `matchMedia` 出现 0 次、存在 0 长度脚本）。水合时 React 的 `suppressHydrationWarning` 之外，`html` 的 `class` 按服务端渲染结果（无 `dark`）被覆盖。

- 位置：[__root.tsx:77](src/routes/__root.tsx#L77)、脚本定义 [__root.tsx:22](src/routes/__root.tsx#L22)
- 修法：改成 `scripts: [{ children: NO_FLASH_SCRIPT }]` 后 SSR 里就能看到 `<script>` 与 `classList.toggle('dark',d)`——**但水合仍会抹掉**（见上表），所以脚本注入只是必要条件，真正要解决的是「水合把 `html` class 重置」；推荐在 `<html>` 上加 `suppressHydrationWarning`（已有）之外，把主题态接进 React 状态或让 RootDocument 在客户端首帧读一次 `document.documentElement.classList`。

## 未发现布局问题的部分

| 检查 | 结果 |
| --- | --- |
| header 高度 | 窄屏（< 640）109px：logo + 语言 + 主题 + 汉堡一行，搜索第二行；≥ 1024 收成 57px 单行 |
| header 子元素重叠 | 0（320~1024 逐档测过 600/639/640/700/767/768/1023/1024 断点边界） |
| 汉堡菜单 | 320/375/390 正常展开，4 项均可点（每项 ≥36px 高），点击导航后自动收起、header 回到 109px，无溢出 |
| footer | 320 单列 382px 高；≥ 640 转两列；4 个信息页入口在所有宽度都可点、不换行错位 |
| 长卡名 / 长地址 / 长公告标题 | 详情页与列表页正确换行或截断（`break-words` / `truncate` 生效），无溢出 |
| 长站名（`site_name` 20+ 字） | header logo 截断，不挤压右侧控件，无溢出 |
| 中/日/英三语 | `/ja/cards`、`/en/cards` 布局一致；英文最长信息页 `Personal data we collect` 在 320 仍单行不溢出 |
| 交互 | 筛选勾选 → `?ip=1&page=1`；header 搜索 → `?q=…&page=1`；均无溢出 |
| 控制台错误 | 除 404 外的 15 个页面 × 7 视口：**0** |

## 次要观察（不阻塞）

1. **无断字的超长字符串会溢出**：卡名/编号/描述塞进一长串无空格 ASCII 时，`/cards/<id>` 溢出 594px、公告详情 588px、店铺 173px——正文类和标题都没 `break-words`。真实数据（日文/中文卡名）不会触发，但后台可自由录入，建议给详情页 `h1`、`.prose` 与店铺名加 `break-words`。
2. **表单控件字号 14px**：iOS Safari 对 `<16px` 的输入框聚焦时会自动放大整页。`/message` 的 textarea、输入框与 header 搜索框都是 14px。这是移动端体感问题，不是布局溢出。
3. **移动端点击目标普遍偏小**：footer 信息页入口高 16px、列表页「清空」24×16px、「← 返回首页」高 17px，低于 WCAG 2.5.8 建议的 24×24。footer 链接密集、间距 `gap-x-5` 尚可，属可接受范围。
4. **地图页 DOM 越界但不算布局 bug**：Leaflet 瓦片天然超出容器，`overflow: hidden` 正常裁剪，`docOverflow` 为 0，无需处理。
5. `/cards?page=999`、`/cards/999999`、`/announcements/999` 都返回 **200** 而不是 404（内容为空态）。SEO 与「不存在页」语义上值得再定，但不影响布局。

## 复现方式

```bash
# 1. 起站点（本机 3000 已是生产构建）
npm run build && npm start

# 2. 起 headless Chrome（本机 Chrome 必须带 --no-sandbox，否则沙箱初始化失败直接退出）
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --no-sandbox --disable-gpu --disable-crash-reporter \
  --user-data-dir=/tmp/chrome-mobile-audit --remote-debugging-port=9334 about:blank &

# 3. 全量扫描（7 视口 × 16 页，落截图）
node .scratch/mobile-audit/sweep.mjs http://localhost:3000 9334

# 只看某个视口
node .scratch/mobile-audit/sweep.mjs http://localhost:3000 9334 320
```

溢出判定基准是 `visualViewport.width`。这点很关键：`mobile: true` 的移动端模拟下，Chrome 会把布局视口撑到内容宽度，用 `scrollWidth - clientWidth` 永远得 0——第一版扫全站「一片绿」，换基准后才暴露出上面的 68px/28px/13px。

## 证据截图

`evidence/`：只保留四张直接支撑上述结论的截图——`not-found-390.png`、`shops-overflow-320.png`、`pagination-320.png`、`home-390.png`。
其余 150 张扫描截图未入库（合计 85MB），需要时按下节命令重跑 `sweep.mjs` 重新生成。

## 修复记录（2026-10-27）

### 1. 分页控件窄屏溢出 → 收缩而不是换行

[Pagination.tsx](src/components/Pagination.tsx)：控件宽度改为 `min-w-7 min-[360px]:min-w-8 sm:min-w-9`，
内边距 `px-1.5 min-[360px]:px-2 sm:px-3`，间距 `gap-1 sm:gap-1.5`。

选了收缩而不是换行：分页是一条整体语义，换成两行会被读成两组页码。最窄 28px 仍高于
WCAG 2.5.8 的 24px 最小点击尺寸；360 以上回到 32px、sm 以上 36px。

| 宽度 | 320 | 340 | 360 | 390 | 430 | 768 | 1024 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 溢出 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 行数 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| 分页总宽 | 284 | 284 | 320 | 320 | 320 | 356 | 356 |

### 2. 店铺栅格被 min-content 撑开 → `minmax(0, …)` + `min-w-0`

[shops.tsx](src/routes/{-$locale}.shops.tsx)：列定义改 `[minmax(280px,380px)_minmax(0,1fr)]`，
两个子项加 `min-w-0`。320 下列宽从 343px 回落到 288px，三档宽度溢出均为 0。

### 3. 404 页空白 + 双重文档 → 用 `shellComponent` 只渲染一次文档

[__root.tsx](src/routes/__root.tsx)：文档外壳从「组件里手动包 `RootDocument`」改为路由级的
`shellComponent: RootDocument`，`RootComponent` 只 `return <Outlet />`，404/500 只输出 `main` 里的内容。

顺带修了 404 的两类连带问题：

- **链接串味**：`to="/{-$locale}/…"` 默认继承当前匹配的 params，而 404 页里那个语言段是非法值
  （`/nope`、`/de/cards`），于是生成 `/nope/cards` 这类二次 404。现在 RootDocument 用解析后的
  `localeParams` 显式传参，404/500 页同理归一。
- 修复前 `/nope` 的 SSR 是 **2 个 `<html>`**、水合失败后 `main` 被清空（只剩 header/footer）；
  现在是 1 个 `<html>`、`main` 正常渲染、0 控制台错误。

### 4. 深色模式刷新丢失 → 把「渲染期读 DOM 并 setState」移出渲染

根因不是脚本没注入（虽然 `dangerouslySetInnerHTML` 确实不产出脚本，已一并改为 `children`），
而是 `ThemeToggle` 在 **render 阶段**读 `document.documentElement.classList` 并 `setState`。
这会在水合过程中触发重渲染，React 按服务端 HTML（`<html>` 上没有 class）重建，把首屏脚本
刚加上的 `dark` 抹掉。实验对照：

| 条件 | 结果 |
| --- | --- |
| 脚本加 class + 渲染期 setState（修复前） | 水合错误 ×1，`className === ""` |
| 脚本加 class + 去掉渲染期 setState | 0 错误，`className === "dark"` |
| theme=light（脚本不加 class） | 0 错误 |

现在 state 只在 `useEffect` 里同步（仅用于 `aria-label`/`aria-pressed`），两个图标都渲染、
由 `dark:` 变体决定可见性，因此没有首帧图标跳变。

### 5. （顺带）无空格长串不再撑破页面

后台可自由录入，超长无空格串（长 URL、长编号、长卡名）原本会溢出 594–664px。给详情页
`h1`/`.prose`/店铺名加 `break-words`（`.prose a` 用 `anywhere`），并给相关 grid/flex 子项补
`min-w-0` 与 `minmax(0,1fr)`——单靠 `break-words` 不能降低 min-content。

覆盖：公告详情正文里的长 URL、超长公告标题、超长卡名，320/390 溢出均为 0。

## 复验结果（修复后）

- **全量扫描 140 次运行**（7 视口 × 20 页，含 404、非法语言段、长串页面）：横向溢出 **0**、控制台错误 **0**、意外失败请求 **0**。
- 生产构建（`npm run build && npm start`）上逐条复验 4 个修复，全部通过；`node scripts/check-i18n.mjs` 全部通过。
- 深色模式在 `/`、`/cards`、`/ja/`、`/en/cards` 刷新后均保留；切换→刷新往返正确；浅色回切正常。
- 404 在 `/nope`、`/de/cards`、`/ja/nope`、`/en/nope`、`/foo/bar/baz` 下均正常渲染，链接全部指向真实页面。
- 汉堡菜单仍为 4 项、展开时 0 溢出、点击后收起；header 109px / 57px 断点行为不变。

修复后的复验数据由上面的「复验结果」小节给出（扫描为脚本实时产出，未落盘截图）。
