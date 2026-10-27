# polish/ —— 探针脚本

都是临时验证脚本，不是产品代码。共同依赖 master 工作区里的 CDP 客户端
（`.scratch/mobile-audit/lib/cdp.mjs`）与一个已用 `--remote-debugging-port=9333`
启动的 headless Chrome。用法：`node .scratch/polish/<name>.mjs`，基线 URL 默认
`http://localhost:3100`（worktree 的 dev server）。

| 脚本 | 验证什么 |
|---|---|
| `capture.mjs` | 7 页 × 1440/390 × 浅色/深色 = 28 张基线截图 |
| `carousel.mjs` | banner 自动播放 / 减少动态下不自动 / 手动仍可用 / 圆点 24px |
| `console.mjs` | 12 页的控制台错误与 ≥400 网络响应 |
| `contrast.mjs` | 从渲染后的计算色值算价格 / 弱化 / 次要文字的对比度 |
| `filter.mjs` | 手机筛选折叠时网格顶端位置、展开后的复选框数量 |
| `firstpaint.mjs` | 首屏网格不带入场动画、改筛选后才有 |
| `gallery2.mjs` | 多图时 ←/→ 切换与 `aria-current` |
| `info.mjs` | 信息页两种宽度截图 |
| `overflow.mjs` | 8 页 × 6 视口的横向溢出 |
| `shot-vault.mjs` | 柜藏级（packaged）卡在列表与详情两处的呈现 |
| `viewport.mjs` | 详情页底部粘性条与末段文字是否重叠 |
| `vt.mjs` | 点击列表卡后 `startViewTransition` 是否真的被调用、名字是否接上 |

临时数据（一条 packaged 卡、两条 banner、两条 cards_images）在验证后已删除；
重新跑 `carousel.mjs` / `gallery2.mjs` 需要先造回对应的数据。
