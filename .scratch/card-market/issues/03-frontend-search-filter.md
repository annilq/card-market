# 前台检索与筛选能力范围

Type: grilling
Status: resolved
Resolved: 2026-10-25
Blocked by: 01, 02（均已 resolved + amended，依赖解除）

## 一、范围与结论摘要

- 检索 / 筛选作用在 `/cards` 卡牌列表页；**多图片画廊属详情页 `/cards/:id`，不在本 ticket**（见 §七 澄清）。
- 关键词搜索**仅**卡名 + 编号（非全局搜索、不搜描述）。
- 排序暴露：价格（升 / 降，默认降）+ 最新上架；**稀有程度是字典过滤，不是排序维度**。
- 筛选 UI：**IP→系列→子系列 级联下钻**（每层多选 checkbox，父约束子可见性）+ 独立扁平 facet（稀有程度多选、只看精品开关、价格区间、关键词框）。
- 结果加载：**分页 + 过滤态写入 URL query**（SSR/SEO 友好、可分享）。

## 二、筛选维度与控件

| 维度 | 控件 | 多选 | 数据来源 | Directus 查询 |
| --- | --- | --- | --- | --- |
| IP（`ips`） | 级联第 1 层 checkbox 树 | ✓ | `ips` 表 | `filter[ip_id][_in]` |
| 系列（`series`） | 级联第 2 层，受已选 IP 约束 | ✓ | `series` 表（按已选 IP 过滤） | `filter[series_id][_in]` |
| 子系列（`sub_series`） | 级联第 3 层，受已选 系列 约束 | ✓ | `sub_series` 表（按已选 系列 过滤） | `filter[sub_series_id][_in]` |
| 稀有程度（`rarities`） | 独立多选 facet | ✓ | `rarities` 表（按已选 IP 动态收窄，见 §八） | `filter[rarity_id][_in]` |
| 只看精品（`is_high_value`） | 开关 | — | `cards` 列 | `filter[is_high_value][_eq]=true` |
| 价格区间 | min / max 输入 | — | `cards.price` | `filter[price][_between]=[min,max]` |
| 关键词 | 搜索框 | — | `cards.name` + `cards.code` | `filter[_or][0][name][_icontains]=q` & `filter[_or][1][code][_icontains]=q` |

> 级联下钻约定：每层用**多选 checkbox**，父级只约束"哪些子级可见"（如勾了宝可梦，系列列表只出现宝可梦的系列）。`sub_series` 在 `cards` 上必填，故"只看某 IP"只需 `ip_id`，无需连带选系列。

## 三、排序

- 暴露选项：**价格降序（默认）/ 价格升序 / 最新上架（created_at DESC）**，由单一排序控件切换。
- 默认 landing 排序 = **价格降序**（沿用 02 决策）。
- **稀有程度不作为排序维度**：它是字典过滤（§二）。价格区间为筛选非排序。
- `is_high_value`（精品）仅作筛选开关，**不参与排序**（沿用 02 决策）。

## 四、检索

- **范围**：卡名 + 编号（`code`）。不搜 `description`，不做跨集合全局搜索（首页搜索框 → 跳转 `/cards?q=<关键词>`）。
- **技术**：保留 Directus 内置 `_icontains` 过滤写法；对 `cards.name` 与 `cards.code` 建 **`pg_trgm` GIN 索引**，使 CJK（中 / 日文卡名、编号）子串模糊匹配走索引、快速且召回正确。
  - 无需自定义 API、无相关度排序（本期不做；要做相关度排名需另建 `tsvector` + 自定义接口）。
  - 索引由迁移 / SQL 建立（Directus 不自动建扩展索引）：`CREATE EXTENSION IF NOT EXISTS pg_trgm;` + 对 `name`、`code` 建 GIN trigram 索引。

## 五、加载与 URL 状态

- **分页**：`page` + `limit`（默认 24 / 48），页码翻页。
- **URL 同步**：全部过滤 / 排序 / 关键词 / 页码序列化进 URL query，可分享、可被搜索引擎收录：
  ```
  /cards?ip=1,2&series=3&sub=4&rarity=5&premium=1&min=100&max=500&q=皮卡&sort=-price&page=2
  ```
- 排序参数约定：`sort=price`（升）/ `-price`（降）/ `created`（最新）。

## 六、Directus 查询骨架（示例）

```
GET /items/cards
  ?filter[status][_eq]=published
  &filter[_and][0][ip_id][_in]=1,2
  &filter[_and][1][rarity_id][_in]=5
  &filter[_and][2][price][_between]=100,500
  &filter[_or][0][name][_icontains]=皮卡
  &filter[_or][1][code][_icontains]=皮卡
  &sort=-price
  &page=2&limit=24
```

> `status=published` 也可由 Public 角色权限保证只返上架卡；前端显式带参更稳。实际以 Directus REST 嵌套 filter 语法为准。

## 七、已推翻 / 澄清的旧假设

- 原 ticket 问"按**类型**筛选" → `card_types` 已删，改为 IP / 系列 / 子系列 / 稀有程度。
- 原问"排序按排序值 / 稀有度" → `sort` 字段已删；**稀有程度非排序维度，是字典过滤**。
- 原"多图片画廊" → 归详情页 `/cards/:id`，不属列表检索；本 ticket 只管列表检索 / 筛选。

## 八、仍开放的次要项（实现期定，不阻塞）

1. **稀有程度 facet 的 IP 收窄**：选了某 IP 后，`rarities` 选项是否动态只列该 IP 的稀有度（避免选出空结果）？倾向"是"，待实现确认。
2. **级联是否允许跨层混选**：当前假设"父约束子可见性 + 每层多选"；若需纯单选路径下钻需另定。
3. **空结果态 / facet 命中计数**：各 facet 显示命中数、无结果空态，属体验增强。
4. **`pg_trgm` 索引落地位置**：在 Directus 集合迁移脚本 / 独立 SQL 中建立，需与 M2 模型落地同步。

## 九、关联文档

- 数据模型：[01-classification-model](01-classification-model.md) / [02-card-fields](02-card-fields.md)。
- 前端路由与 API 接入：`docs/development.md` §7（路由表 + §7.1 检索筛选摘要）。
