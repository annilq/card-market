# 公告是否需要置顶/定时发布/历史归档

Type: grilling
Status: resolved
Resolved: 2026-10-26
Blocked by:

## Question

`spec.md` 的公告管理含标题、富文本正文、发布状态、发布时间、排序，但标注"是否需要公告置顶、定时发布和历史公告归档，待确认"。需决定：

1. 是否需要置顶（`is_pinned`）？
2. 是否需要定时发布（发布时间在未来时暂不前台展示）？
3. 是否需要对过期公告做归档/下线处理？

影响 `announcements` 数据模型与前台列表排序/过滤逻辑。

## Decision（grill 收敛）

经 grill，3 个待定项全部收敛，并消解了 `announcements` 与 cards/banners 的 status 不一致矛盾：

1. **status 机制 → 统一复用 Directus 内置 status**（draft / published / archived），与 cards/banners 一致。删除原自定义 enum（草稿/已发布）；`archived` 天然对应"归档"。
2. **置顶 `is_pinned` → 需要。** 列表顺序：置顶组（`is_pinned=true`）在前、普通组在后；组内按 `published_at` 倒序（`sort` 作可选手动 tie-break）。
3. **定时发布 → 需要。** 未来 `published_at` 暂不前台展示。可见性 = `status=published AND (published_at IS NULL OR published_at <= now)`；需应用层/动态 query 拼 `now`（Directus 静态 filter 写不了 `now`）。`published_at` 为可空手动字段，null = 发布即展示。
4. **归档/过期 → 手动归档（`status=archived`）。** 无自动过期（不加 `end_time`），与 banner 拒绝的 start+end 时间窗保持一致；运营手动将 status 置 `archived` 即下线。

## 最终 `announcements` 数据模型

| 字段 | 类型 | 说明 | 必填 |
| --- | --- | --- | --- |
| id | PK |  | — |
| title | string | 标题 | 始终（必填） |
| body | rich text | 正文（富文本） | 可选 |
| published_at | timestamp | 发布时间；未来 = 定时发布，null = 发布即展示 | 可选 |
| is_pinned | boolean | 置顶 | 可选（默认 false） |
| sort | integer | 手动排序 tie-break（组内生效） | 可选（默认 0） |
| status | — | **Directus 内置 status**：draft / published / archived | — |
| created_at / updated_at | timestamp | 自动 | — |

> 已删除：原自定义 `status` enum（草稿/已发布，改 Directus status）。无 `end_time`（仅手动归档，无自动过期）。

## 前台列表排序与可见性

- **可见集合**：`status=published AND (published_at IS NULL OR published_at <= now)`
- **排序**：`is_pinned DESC, published_at DESC`（`sort` 为可选手动 tie-break，组内生效）
- **archived** 公告不进入公开列表。

## 反转的旧假设 / 矛盾消解

- 原 §4.4 自定义 `status` enum 与 cards/banners 的 Directus status **不一致** → 现已统一。
- "定时发布"仅用 `published_at`（单侧开始时间），**非 banner 拒绝的 start+end 时间窗**，复杂度可控，且与"手动归档无自动过期"取向一致。

## 仍开放的次要项（实现期定，不阻塞）

1. **置顶组内 tie-break**：多条置顶时按 `published_at` 倒序，还是按 `sort` 手动定？倾向 `published_at` 倒序。
2. **rich text 渲染安全**：`body` 富文本前台渲染需防 XSS（白名单 sanitize 或 Directus 输出净化）。

## 影响文件

- `docs/development.md` §4.4 / §4.8 / §9 / §11
- `docs/requirements.md` §3.6 / §4 / §9
