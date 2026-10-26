# banner 是否需要开始/结束时间与多 banner 位

Type: grilling
Status: resolved
Resolved: 2026-10-26
Blocked by:

## Question

`spec.md` 的 banner 管理含新增/编辑/删除、图片、标题、描述、跳转链接、展示位置、启用停用、排序，但标注"是否需要开始时间、结束时间，以及是否需要多个 banner 位，待确认"。需决定：

1. 是否需要定时上下线（开始/结束时间）？
2. 是否需要多个 banner 位（如首页顶部轮播位 vs 分类页侧栏位），以 `position` 枚举表达？
3. 轮播策略（自动播放、切换间隔）是否由后台配置？

影响 `banners` 数据模型与前台展示逻辑。

## Decision（grill 收敛）

经 grill，3 个待定项全部收敛，且顺势消解了 4 个潜在矛盾（详见下方「反转的旧假设」）：

1. **定时上下线（start/end time）→ 不做。** banner 仅靠 Directus 内置 status（draft/published/archived）控制上下线，不引入时间窗。理由：运营手动上下线已满足需求，定时预售/自动下架非当前诉求；去掉时间窗后，前台可见性 = `status=published`，无需动态 `now between` 过滤。
2. **多 banner 位（position 枚举）→ 单槽位。** 全站仅首页顶部一个轮播槽位，不区分 position。理由：明确需求只有首页轮播，分类页侧栏位无落地场景；单槽位下 `sort` 即轮播顺序，无跨槽位序域冲突。
3. **轮播策略（自动播放/切换间隔）→ 前端硬编码常量**（如自动播放、5s 切换）。不进数据模型、不建槽位配置表。理由：单槽位下轮播是单一组件行为，后台配置收益低、徒增复杂度。
4. **status 机制 → 彻底统一复用 Directus 内置 status**（draft/published/archived），与 `cards` 一致。删除原 boolean「启用/停用」字段。理由：全站生命周期机制统一，后台维护心智一致，公开读取过滤逻辑统一。

## 最终 `banners` 数据模型

| 字段 | 类型 | 说明 | 必填 |
| --- | --- | --- | --- |
| id | PK |  | — |
| title | string | 标题 | 可选 |
| description | text | 描述 | 可选 |
| image | FK→directus_files | 轮播图（必填） | 始终 |
| link | string | 跳转链接（内部路由或外部 URL） | 可选 |
| sort | integer | 轮播顺序（单槽位内） | 可选（默认 0） |
| status | — | **Directus 内置 status**：draft / published / archived | — |

> 已删除：原 `position`（多槽位枚举）、原 boolean `status`（启用/停用，改 Directus status）、`start_time` / `end_time`（定时上下线）。

## 反转的旧假设 / 矛盾消解

- 原 §4.3 把 `position` / `start_time` / `end_time` 标「待定 05」——现已确认**全部移除**。
- 原 `banners` 用 boolean `status`、而 `cards` 用 Directus status 的**不一致**——现已统一为 Directus status。
- 原 grill 第一波担心的 3 个矛盾随决策直接不成立：
  - 「动态 `now between` API 过滤」→ Q1 不做时间窗，作废；
  - 「`sort` 跨槽位序域冲突」→ Q2 单槽位，全局序成立；
  - 「轮播间隔 per-banner 建模错误」→ Q3 前端硬编码，不进模型。

## 仍开放的次要项（实现期定，不阻塞）

1. **`link` 内/外链与安全**：内部跳转（如 `/cards?ip=...`、`/announcements/:id`）走前端路由；外部 URL 需 `target="_blank" rel="noopener noreferrer"`，并对链接做基础校验/协议白名单，防 `javascript:` 等注入。
2. **图片宽高比**：单槽位轮播建议固定比例（如 16:9 或运营规范），上传时由运营控制；前端按容器裁切展示。

## 影响文件

- `docs/development.md` §4.3 / §4.8 / §9 / §11
- `docs/requirements.md` §3.5 / §4 / §9
