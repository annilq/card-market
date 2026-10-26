# 后台「商品图片」无法上传，提示 relationship is not configured properly

Type: task
Status: resolved
Resolved: 2026-10-26

## Symptom

Directus 后台 → 内容 → 卡牌 → 任一卡牌，`商品图片` 字段下方不显示「新建 / 添加现有 / 上传」，
只有一条提示：

```
The relationship is not configured properly or you don't have permission to access it
```

前端的卡牌列表/详情页图片显示**正常**（匿名 API 读 `cards.images` 一直是好的），
因此这不是数据问题，也不是 Public 权限问题。

## Root cause

`directus_relations` 里 M2M 的两条关系缺 `meta.junction_field`。

Directus 后台 `list-m2m` 接口用 `useRelationM2M()` 解析关系，判定条件是：

```js
relations.find(r =>
  r.related_collection === collection &&
  r.meta?.one_field === field &&
  r.meta.junction_field            // ← 缺这个就找不到
)
// 再沿 r.meta.junction_field 找另一条关系得到 relatedCollection
```

`bootstrap.mjs` 的 `ensureM2M()` 早期版本建关系时只写了
`one_field` / `one_deselect_action` / `sort_field`，**漏了 `junction_field`**。
于是：

- `o2m` 侧（`cards_images.cards_id → cards`，`one_field = images`）虽然存在，但 `junction_field` 为 NULL；
- 后台找不到这条 M2M，`relationInfo` 为 `undefined`；
- 模板走到 `v-else` 分支渲染 `$t('relationship_not_setup')` → 就是那条英文警告。

接口层（`GET /items/cards?fields=images.*`、`POST /items/cards_images`）不依赖该元数据，所以 API 全绿。
这也解释了为什么它看起来像「权限问题」而实际不是。

同样缺 `junction_field` 的还有 `cards_images.directus_files_id → directus_files` 这条——
两条关系必须互指对方字段，缺一条后台同样找不到 `relatedCollection`。

## Fix

1. `directus/bootstrap.mjs`
   - `ensureM2M()` 建关系时写入 `meta.junction_field`（两条互指），新环境直接正确。
   - 新增 `ensureJunctionSide()`：存量环境若 `junction_field` 缺失/外键缺失，按需 PATCH 补齐；
     全部正确时零写入（幂等）。
2. ⚠ `PATCH /relations` 的坑：`RelationsService.updateOne()` 的实现是
   **DROP 外键 → alterType → 再 ADD 外键**，`on_delete` 只从请求体 `schema` 里取。
   漏传 `schema` 会让外键直接消失（本次排查中确实踩到，`pg_constraint` 从 2 条变 1 条）。
   所以 `ensureJunctionSide()` 必带 `schema: { on_delete: 'NO ACTION' }`，
   并主动检查 `pg_constraint`，外键丢了顺带补回。

## Verification

- 复现：`UPDATE directus_relations SET junction_field=NULL WHERE many_collection='cards_images'`
  + 清缓存 + 刷新后台 → 警告出现，「新建/添加现有」消失（截图 `evidence/m2m-before-fix.png`）。
- 修复：`npm run directus:bootstrap` → 打印两条「✓ 修复 M2M 元数据」→ 刷新后台
  → 警告消失，图片行 + 「新建 / 添加现有」正常（截图 `evidence/m2m-after-fix.png`）。
- 幂等：连跑两次 bootstrap，第二次无任何 M2M/外键输出。
- 三个场景回归（元数据缺失 / 外键丢失 / 两者全坏）均能一次修好，且修完外键仍是 2 条。
- 接口回归：`POST /items/cards_images` 建关联 + `GET /items/cards/1?fields=images.*` 读回正常，
  测试行已删除。

## Notes

- 该元数据无法从接口层"看出来"：`/fields/cards` 里 `images` 的 `type/special/interface` 全都正确，
  只有查 `/relations`（或 `directus_relations`）才能发现 `junction_field` 为空。
  排查 M2M 类问题时先看这张表。
- 无权限时也可能出现同一条文案，但那种情况下 `/relations` 正常、且会伴随 403；
  本次 `/relations` 与 `/permissions` 全部正常，可排除权限因素。
