// 全站移动端扫描：每个页面 × 每个视口跑一次探针，结果落 JSON + 截图。
// 用法：node .scratch/mobile-audit/sweep.mjs [baseUrl] [port]
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { connect } from './lib/cdp.mjs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const PORT = Number(process.argv[3] ?? 9334)
const PROBE = await readFile(new URL('./lib/probe.js', import.meta.url), 'utf8')
const OUT = new URL('./out/', import.meta.url).pathname

// 覆盖常见手机宽度 + 小屏断点边界。360/320 是最容易被漏的窄屏。
const VIEWPORTS = [
  { id: '320', width: 320, height: 640, mobile: true },
  { id: '360', width: 360, height: 800, mobile: true },
  { id: '375', width: 375, height: 812, mobile: true },
  { id: '390', width: 390, height: 844, mobile: true },
  { id: '430', width: 430, height: 932, mobile: true },
  { id: '768', width: 768, height: 1024, mobile: true },
  { id: 'landscape-844', width: 844, height: 390, mobile: true },
]

const PAGES = [
  { id: 'home', path: '/' },
  { id: 'cards', path: '/cards' },
  { id: 'cards-filtered', path: '/cards?ip=1&hv=true&sort=price_asc' },
  // 分页满窗口（› 1 … 5 6 7 [8] 9 ‹）：9 个 36px 控件是窄屏最容易撑破的一行
  { id: 'cards-paged', path: '/cards?page=5' },
  { id: 'card-detail', path: '/cards/1' },
  { id: 'announcements', path: '/announcements' },
  { id: 'announcement-detail', path: '/announcements/1' },
  { id: 'shops', path: '/shops' },
  { id: 'message', path: '/message' },
  { id: 'info-operation', path: '/info/operation' },
  { id: 'info-personal-info', path: '/info/personal-info' },
  { id: 'info-terms', path: '/info/terms' },
  { id: 'info-data-usage', path: '/info/data-usage' },
  { id: 'cards-ja', path: '/ja/cards' },
  { id: 'cards-en', path: '/en/cards' },
  { id: 'not-found', path: '/nope' },
  { id: 'not-found-locale', path: '/de/cards' },
  // 无空格长串（后台可录入）：标题/正文/卡名都不应该撑破页面
  { id: 'ann-long-url', path: '/announcements/6' },
  { id: 'ann-long-title', path: '/announcements/7' },
  { id: 'card-long-name', path: '/cards/979' },
]

const only = process.argv[4]
const vps = only ? VIEWPORTS.filter((v) => v.id === only) : VIEWPORTS

await mkdir(OUT + 'shots', { recursive: true })
const cdp = await connect(PORT)
const report = { base: BASE, generatedAt: new Date().toISOString(), runs: [] }

for (const vp of vps) {
  await cdp.setViewport(vp)
  for (const page of PAGES) {
    cdp.resetErrors()
    try {
      await cdp.goto(BASE + page.path)
      const probe = await cdp.evaluate(PROBE)
      const shot = `${OUT}shots/${page.id}-${vp.id}.png`
      await cdp.screenshot(shot)
      report.runs.push({
        viewport: vp.id,
        page: page.id,
        path: page.path,
        probe,
        errors: [...cdp.consoleErrors],
        failedRequests: [...cdp.networkFailures],
        screenshot: shot,
      })
      const flag = probe.docOverflow > 0 ? `OVERFLOW +${probe.docOverflow}` : "ok"
      console.log(`${vp.id.padEnd(14)} ${page.id.padEnd(22)} ${flag}`)
    } catch (err) {
      report.runs.push({
        viewport: vp.id,
        page: page.id,
        path: page.path,
        error: String(err).slice(0, 500),
      })
      console.log(`${vp.id.padEnd(14)} ${page.id.padEnd(22)} FAILED ${err}`)
    }
  }
}

// 移动端菜单展开态单独测
await cdp.setViewport(VIEWPORTS[2])
cdp.resetErrors()
await cdp.goto(BASE + '/')
const burger = await cdp.evaluate(`(() => {
  const b = document.querySelector('header button[aria-expanded]')
  if (!b) return { found: false }
  const r = b.getBoundingClientRect()
  return { found: true, w: Math.round(r.width), h: Math.round(r.height), label: b.getAttribute('aria-label') }
})()`)
if (burger.found) {
  await cdp.click('header button[aria-expanded]')
  const menu = await cdp.evaluate(`(() => {
    const header = document.querySelector('header')
    const navs = [...header.querySelectorAll('nav')].filter(n => {
      const r = n.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    const last = navs[navs.length - 1]
    const items = last ? [...last.querySelectorAll('a')].map(a => {
      const r = a.getBoundingClientRect()
      return { text: a.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }
    }) : []
    const box = last ? last.getBoundingClientRect() : null
    return {
      open: !!last,
      expanded: document.querySelector('header button[aria-expanded]').getAttribute('aria-expanded'),
      headerHeight: Math.round(header.getBoundingClientRect().height),
      box: box ? { x: Math.round(box.x), w: Math.round(box.width), h: Math.round(box.height) } : null,
      items,
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })()`)
  await cdp.screenshot(`${OUT}shots/menu-open-390.png`, { fullPage: false })
  await cdp.click('header button[aria-expanded]')
  const closed = await cdp.evaluate(
    `document.querySelector('header button[aria-expanded]').getAttribute('aria-expanded')`,
  )
  report.menu = { burger, menu, closedExpanded: closed, errors: [...cdp.consoleErrors] }
  console.log('menu:', JSON.stringify(menu).slice(0, 300))
}

await writeFile(OUT + 'report.json', JSON.stringify(report, null, 2))
console.log('wrote', OUT + 'report.json')
cdp.close()
