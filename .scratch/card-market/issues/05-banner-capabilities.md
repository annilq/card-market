# banner 是否需要开始/结束时间与多 banner 位

Type: grilling
Status: open
Blocked by:

## Question

`spec.md` 的 banner 管理含新增/编辑/删除、图片、标题、描述、跳转链接、展示位置、启用停用、排序，但标注"是否需要开始时间、结束时间，以及是否需要多个 banner 位，待确认"。需决定：

1. 是否需要定时上下线（开始/结束时间）？
2. 是否需要多个 banner 位（如首页顶部轮播位 vs 分类页侧栏位），以 `position` 枚举表达？
3. 轮播策略（自动播放、切换间隔）是否由后台配置？

影响 `banners` 数据模型与前台展示逻辑。
