# 布局优化验收记录（2026-10-27）

参考站截图与本目录下的 CDP 脚本是本次验收的可复现证据。
脚本用法：先起 3000，再以 `--remote-debugging-port=9333` 起 headless Chrome，
然后 `node .scratch/layout-v2/cdp7.mjs`（全页扫描）等。

## 量出来的结论

| 检查 | 结果 |
| --- | --- |
| 1440 宽 header 高度 | 57px（搜索与 logo 同行，input 508px） |
| 390 / 768 宽 header 高度 | 109px（搜索落到第二行，input 290 / 653px） |
| 各页面横向溢出（scrollWidth - clientWidth） | 390 与 1440 下全为 0 |
| 控制台错误 | 0 |
| 从带筛选的列表页搜索 | `?ip=1&hv=true&page=1` → 追加 `&q=…`，筛选保留、page 未重置 |
| 翻页保留筛选与排序 | `?ip=1&sort=price_asc` → 第 2 页 `?ip=1&sort=price_asc&page=2` |
| 页码窗口（216 张 = 9 页） | `‹ [1] 2 3 4 5 … 9 ›`、第 5 页 `‹ 1 … 4 [5] 6 … 9 ›`、第 9 页 `‹ 1 … 5 6 7 8 [9] ›` |
| 三语分页 aria | 上一页/第 n 页、前へ/n ページ、Previous/Page n |
| 首页高价买取 | 3 张（id 2 / 4 / 1），「全部」→ `/cards?hv=true` |
| `node scripts/check-i18n.mjs` | 全部通过 |

## 数据清理

为验证省略号窗口临时插入 210 张 `PAGETEST-*` 卡牌，
按 name 与 code 双前缀精确匹配删除，删后卡牌总数回到 6 张（id 1–6 原样）。
