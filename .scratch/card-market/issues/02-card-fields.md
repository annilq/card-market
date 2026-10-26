# 卡牌信息字段的最终定义、选项与必填规则

Type: grilling
Status: resolved
Resolved: 2026-10-25
Amended: 2026-10-25（新增 `编号` 字段 cards.code；删除 `卡牌类型` 维度 type_id/card_types；sub_series 改为必填、display_status 改复用 Directus 内置 status、排序仅 price DESC、is_high_value 自由标注、archived 兼表下架与已售、删除 cards.sort 字段）
Blocked by: (01 已 resolved 并 amend 为三层，依赖解除)

## Question

`spec.md` 给出卡牌信息初步字段：名称 / 所属类别 / 所属系列 / 卡牌类型 / 回购类型 / 卡牌状态(裸卡/有包装) / 稀有程度 / 商品图片 / 商品描述 / 价格 / 是否高价买取 / 展示状态(上架/下架) / 排序 / 时间。需确认：

1. 各字段的数据类型与枚举取值（尤其"回购类型"的业务含义与可选值）。
2. 哪些字段必填、哪些可选。
3. 价格字段：是单值还是区间？是否区分"买取价 / 估值"？
4. "卡牌状态""稀有程度""展示状态"的枚举是否配置化。

依赖 [卡牌分类的层级与字段枚举如何建模](01-classification-model.md) 先定分类维度，再定卡牌字段。

## Decision（经 grill-me 多轮锁定）

### 一、分类维度（依赖 01，已 amend 为三层）

- `ips`（所属类别 / IP 维度 / 大类）：宝可梦 / 龙珠 / 游戏王 … 顶层维度。
- `series`（所属系列）：归属 `ips`，如 拡張パック MEGA。
- `sub_series`（子系列）：归属 `series`，如 `[M6a] 30th CELEBRATION`；**必填**（龙珠等仅两层的 IP 须建空壳子系列占位，保证 code 组合唯一生效）。
- `rarities`（稀有程度）：**全局单一枚举表**，后台配置。

> 原"回购类型"字段**已删除**——它与"所属类别(IP)"是同一概念，合并到 `ips`。

### 二、最终字段表

| 字段 | 数据类型 | 枚举 / 取值 | 必填（状态机） | 备注 |
|---|---|---|---|---|
| 名称 `name` | string | 自由文本 | 必填（始终） | 卡片标题 |
| 所属类别 `ip_id` | FK→ips | IP 维度 | 必填（始终） | 即 IP，原"回购类型"并入 |
| 所属系列 `series_id` | FK→series | 系列 | 必填（始终） | |
| 子系列 `sub_series_id` | FK→sub_series | 子系列 | 必填（始终） | 龙珠等仅两层的 IP 须建空壳子系列占位；保证 (ip_id, series_id, sub_series_id, code) 组合唯一有效 |
| 编号 `code` | string | 收藏编号，如 `123/197` / `SWSH01-025` | 下架可选 / 上架必填 | 卡在某系列/子系列中的定位标识；建议 (ip_id, series_id, sub_series_id, code) 组合唯一 |
| 稀有程度 `rarity_id` | FK→rarities | 全局枚举 | 必填（始终） | 后台配置单一表 |
| 商品图片 `images` | M2M→directus_files | 多图 | 下架可选 / 上架必填(≥1) | 草稿可空 |
| 商品描述 `description` | text | 自由文本 | 可选 | |
| 价格 `price` | decimal(10,2) | 卖价（标价） | 下架可选 / 上架必填 | **仅卖价**，不含买取价 / 估值 |
| 是否高价买取 `is_high_value` | bool | true / false | 可选（默认 false） | **纯标识**：运营自由标注、无统一标准；仅用于前台独立筛选「只看精品」，不参与排序（与价格/rarity 无关，与客观 rarity 正交） |
| 卡牌状态 `card_status` | enum | 裸卡 / 有包装 | 必填（默认 裸卡） | 固定小枚举（代码常量，不进后台） |
| 展示状态 | — | draft / published / archived | — | **复用 Directus 内置 status**，cards 不再自建该字段；草稿=draft、上架=published、下架=archived |
| 时间 `created_at` / `updated_at` | timestamp | — | 系统字段（始终） | 创建 / 更新时间 |

### 三、必填状态机

- **draft（草稿 / 下架）**：`name` + `ip_id` + `series_id` + `sub_series_id` + `rarity_id` + `card_status` 必填；`price` / `images` / `description` / `code` / `is_high_value` 可选。
- **published（上架）**：在草稿基础上，`price` / `code` 必填、`images` 至少 1 张必填。
- **archived（下架归档）**：同 published 数据完整性要求，仅生命周期态不同（不可在前台检索）。

### 四、枚举配置化结论

- **后台可配置维度集合**（Directus 维护，运营自助增删）：`ips` / `series` / `sub_series` / `rarities`。
- **固定小枚举 / 常量**（不进后台）：`card_status`(裸卡/有包装)、`is_high_value`(bool)。`display_status` 已改为复用 Directus 内置 status（draft/published/archived）。

### 五、仍开放的次要项（下一轮）

1. ~~`sort` 字段~~：已删除 `cards.sort`（列表默认仅 price DESC，无手动置顶需求）；维度表的 `sort` 列保留用于 facet 排序。
2. ~~列表排序优先级~~：已定「仅 price DESC」，`sort` 与 `is_high_value` 均不参与排序。
3. ~~`is_high_value` 勾选依据~~：已定「运营自由标注、无统一标准」，仅用于「只看精品」筛选。
4. ~~「已售」状态归处~~：已定 Directus `archived` 兼表「下架」与「已售」，已售可由订单关联推导，cards 不单列。

## 由此派生的数据模型

见 [01-classification-model](01-classification-model.md) 的 §派生数据模型（已 amend 为三层：`ips`→`series`→`sub_series`，`cards` 含 `name` / `created_at` / `updated_at`，删除 `buyback_type`）。
