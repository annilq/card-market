// 筛选面板交互验收：真点一遍，断言 URL、面板几何与色值，不靠肉眼。
import { connect } from '/Users/annilq/Documents/develop/card-market/.scratch/mobile-audit/lib/cdp.mjs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const cdp = await connect(Number(process.env.CDP_PORT ?? 9340))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// 主题用 CDP 模拟媒体特性，而不是写 localStorage：并发会话改文件会让 Vite 整页
// reload，reload 后无闪烁脚本会按系统偏好重新上色，写进去的值管不住下一次加载。
const setScheme = (theme) =>
  cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: theme }],
  });

let fails = 0
const check = (name, got, want, tol = 1) => {
  const ok =
    typeof want === 'number' ? Math.abs(got - want) <= tol : String(got) === String(want)
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${got}${ok ? '' : ` (want ${want})`}`)
}

await cdp.setViewport({ width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 })
await setScheme('light')
await cdp.goto(BASE + '/', { settle: 1200 })
await sleep(500)

const findButton = (label) =>
  cdp.evaluate(`(() => {
  const btns = [...document.querySelectorAll('main button')]
  const b = btns.find((x) => x.textContent.trim().startsWith(${JSON.stringify(label)}) && x.getAttribute('aria-haspopup') === 'dialog')
  if (!b) return 'MISSING'
  b.click()
  return 'clicked'
})()`)

const sheet = () =>
  cdp.evaluate(`(() => {
  const d = document.querySelector('[role=dialog]')
  if (!d) return JSON.stringify({open: false})
  const b = d.getBoundingClientRect()
  const cs = getComputedStyle(d)
  const tabs = [...d.querySelectorAll('button[aria-current]')]
  const right = d.querySelectorAll('div.overflow-y-auto')
  return JSON.stringify({
    open: true,
    label: d.getAttribute('aria-label'),
    x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height),
    rightEdge: Math.round(b.right), winW: window.innerWidth,
    bg: cs.backgroundColor,
    tabCount: tabs.length,
    activeTab: tabs.findIndex((t) => t.getAttribute('aria-current') === 'true'),
    rightRows: right.length ? right[right.length - 1].querySelectorAll('button').length : 0,
    rowH: right.length ? Math.round(right[right.length - 1].querySelector('button')?.getBoundingClientRect().height ?? 0) : 0,
  })
})()`)

// 1) 三个控件都变成按钮了
const btns = JSON.parse(
  await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('main button[aria-haspopup=dialog]')].map((b) => b.textContent.trim()))`),
)
console.log('controls:', btns)
check('三个筛选都是可点击控件', btns.length, 3)

// 2) 打开「分类」：应为二级面板（左竖 tab + 右列，右列首项「全部」）
console.log('open 分类:', await findButton('分类'))
await sleep(350)
let s = JSON.parse(await sheet())
console.log('sheet:', s)
check('面板已打开', s.open, true)
check('面板贴右边缘', s.rightEdge, s.winW, 1)
check('面板满高', s.h, 900, 2)
check('面板底色 = 品牌红', s.bg, 'rgb(219, 38, 29)')
check('主系列竖 tab ≥ 2', s.tabCount >= 2, true)
check('右列行数 ≥ 2（含「全部」）', s.rightRows >= 2, true)
check('行高 48', s.rowH, 48)
const firstRow = await cdp.evaluate(`(() => {
  const d = document.querySelector('[role=dialog]')
  const cols = d.querySelectorAll('div.overflow-y-auto')
  return cols[cols.length - 1].querySelector('button').textContent.trim()
})()`)
check('右列首项是「全部」', firstRow, '全部')

// 3) 切主系列 tab → 右列内容随 tab 变
const before = await cdp.evaluate(`(() => {
  const d = document.querySelector('[role=dialog]')
  const tabs = [...d.querySelectorAll('button[aria-current]')]
  if (tabs.length > 1) tabs[1].click()
  return JSON.stringify({tabs: tabs.length})
})()`)
await sleep(250)
s = JSON.parse(await sheet())
console.log('after tab switch:', { tabCount: s.tabCount, activeTab: s.activeTab })
check('切 tab 后 activeTab 变到第 2 个', s.activeTab, 1)

// 4) 选子系列首项（「全部」）→ 生效并关闭
await cdp.evaluate(`(() => {
  const d = document.querySelector('[role=dialog]')
  const cols = d.querySelectorAll('div.overflow-y-auto')
  cols[cols.length - 1].querySelector('button').click()
})()`)
await sleep(600)
const url1 = await cdp.evaluate(`location.search`)
s = JSON.parse(await sheet())
console.log('after pick 全部:', url1, 'sheet open?', s.open)
check('选中后 URL 带 series=', /series=\d+/.test(url1), true)
check('选中后 URL 不带 sub=', /sub=/.test(url1), false)
check('选中后面板关闭', s.open, false)

// 5) 再开分类，选一个子系列 → URL 带 sub=
await findButton('分类')
await sleep(350)
const subName = await cdp.evaluate(`(() => {
  const d = document.querySelector('[role=dialog]')
  const cols = d.querySelectorAll('div.overflow-y-auto')
  const rows = [...cols[cols.length - 1].querySelectorAll('button')]
  const target = rows[1]
  if (!target) return null
  const name = target.textContent.trim()
  target.click()
  return name
})()`)
await sleep(600)
const url2 = await cdp.evaluate(`location.search`)
console.log('picked sub:', subName, '→', url2)
if (subName) {
  check('选子系列后 URL 带 sub=', /sub=\d+/.test(url2), true)
}

// 6) 类型与排序是一级面板
for (const [label, key, re] of [
  ['类型', 'type', /type=raw/],
  ['排序', 'sort', /sort=/],
]) {
  await cdp.goto(BASE + '/', { settle: 900 })
  await sleep(300)
  await findButton(label)
  await sleep(300)
  const one = JSON.parse(await sheet())
  check(`${label} 是单列（无竖 tab）`, one.tabCount, 0)
  await cdp.evaluate(`(() => {
    const d = document.querySelector('[role=dialog]')
    const cols = d.querySelectorAll('div.overflow-y-auto')
    const rows = [...cols[cols.length - 1].querySelectorAll('button')]
    rows[1].click()
  })()`)
  await sleep(600)
  const u = await cdp.evaluate(`location.search`)
  console.log(label, '→', u)
  check(`${label} 选中后 URL 生效`, re.test(u), true)
}

// 7) 面板打开时不报错
await cdp.goto(BASE + '/', { settle: 900 })
await sleep(300)
cdp.resetErrors()
await findButton('分类')
await sleep(400)
const errs = cdp.consoleErrors.filter((e) => !/favicon|Failed to load resource/.test(e))
check('打开面板无控制台报错', errs.length, 0)

console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
