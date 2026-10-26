# 卡牌分类的层级与字段枚举如何建模

Type: grilling
Status: resolved
Resolved: 2026-10-25
Amended: 2026-10-25（经 02 grill 回写：categories→ips 顶层、新增 sub_series 三层、删除 buyback_type、cards 补 name/created_at/updated_at；删 `卡牌类型`；sub_series 改为必填、display_status 改复用 Directus 内置 status、排序仅 price DESC、is_high_value 自由标注、archived 兼表下架与已售、删除 cards.sort 字段）
Blocked by:

## Question

卡牌分类应如何在数据模型中表达？`spec.md` 列出"卡牌类别(宝可梦) / 系列分类(MEGA) / 卡牌类型 / 稀有程度 / 排序 / 状态"多个维度，但层级与枚举未定。

## Decision（经 grill-me 四问锁定）

1. **多 IP 卡牌集市** → `卡牌类别` 即 **IP 维度**，建模为顶层维度集合 `ips`，承载不同 IP（宝可梦 / 龙珠 / 游戏王 …）。`ips` 本身就是"大类"，不再有独立于 IP 之上的"类别"层。
2. **三层层级：IP → 系列 → 子系列** → `series` 为 `ips` 的子集合（FK `ip_id`）；`sub_series` 为 `series` 的子集合（FK `series_id`）。`sub_series` **必填**（如龙珠等仅两层的 IP 须建空壳子系列占位），以保证 `cards` 上 (ip_id, series_id, sub_series_id, code) 组合唯一约束有效（NULL 不参与唯一匹配，故不可为空）。
   > ⚠️ 第 2 点推翻原"两层层级、不引入三层及以上"结论，系 2026-10-25 经 [02-card-fields](02-card-fields.md) grill 回写。
3. **`稀有程度` = 独立维度集合 + 关系**（推荐路径），**不是 `cards` 上的属性列**。即 `rarities` 为独立集合，`cards` 用 `rarity_id` 关系引用。
   > 注：`卡牌类型`(card_types) 维度已于 2026-10-25 经 [02-card-fields](02-card-fields.md) 决定删除，不再作为独立维度。
4. **枚举后台配置化** → 维度集合（`ips` / `series` / `sub_series` / `rarities`）全部由 Directus 后台维护，运营自助增删，**不入代码**。

### 明确排除出"分类维度"的项
- `状态`（草稿 / 上架 / 下架或已售归档）：属卡牌生命周期，**复用 Directus 内置 status**（draft / published / archived），`cards` 不再自建 `display_status` 字段；archived 兼表「下架」与「已售」，已售可由订单关联推导，cards 不单列。
- `排序`：维度表（`ips` / `series` / `sub_series` / `rarities`）保留 `sort` 列用于 facet 排序；**`cards` 不再设 `sort` 字段**（列表默认 price DESC，无手动置顶需求）。

## 由此派生的数据模型（落地到 docs/development.md §4）

- `ips`（卡牌类别 / IP 维度 / 大类）：`id, name, sort, status`
- `series`（系列分类，IP 子级）：`id, name, ip_id→ips, sort, status`
- `sub_series`（子系列，系列子级，可选）：`id, name, series_id→series, sort, status`
- `rarities`（稀有程度维度，全局单一枚举，后台配置）：`id, name, sort, status`
- `cards`：`ip_id→ips`、`series_id→series`、`sub_series_id→sub_series(必填)`、`rarity_id→rarities`，外加 `code`(编号/收藏号)、`name`、`card_status`(裸卡/有包装)、`images(M2M→directus_files)`、`description`、`price`(仅卖价)、`is_high_value`(纯标识/精品标)、`created_at`、`updated_at`；**状态用 Directus 内置 status，无 display_status 字段、无 sort 字段**。
  - **删除**原 `buyback_type`：与"所属类别(IP)"重复，已并入 `ips`（详见 [02-card-fields](02-card-fields.md)）。
  - **新增** `code`(编号)：卡牌在所属系列/子系列中的收藏编号（如 `123/197`），字符串；建议与 `ip_id`/`series_id`/`sub_series_id` 组合唯一。

## 前台筛选 UX 流向（供 ticket 03 参考）
按 IP（ips）分馆 → 选系列（series）→ 选子系列（sub_series）→ 叠加稀有程度 facet（rarities 多选）。维度集合均为后台可配置，筛选侧边栏自动同步；列表默认按 `price` DESC，`is_high_value` 仅作「只看精品」筛选维度、不影响排序。

## 后续联动
- `docs/development.md` §4 已由单张通用 `categories(dimension)` 重构为四张独立集合。
- `docs/requirements.md` §3.2 / §4 数据实体草案已同步收敛。
- 已联动：卡牌信息字段定义与必填规则见 [02-card-fields](../.scratch/card-market/issues/02-card-fields.md)（已 resolved：IP 去重、价格=仅卖价、is_high_value 纯标识、三层 amend 等结论）。
