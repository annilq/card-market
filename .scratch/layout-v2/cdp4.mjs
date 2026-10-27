const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res) => ws.addEventListener('open', res, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300))
  return r.result?.result?.value
}
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(1500) }
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })

const readPager = () => evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="分页"]')
  if (!nav) return null
  return {
    labels: [...nav.querySelectorAll('button')].map(b => b.textContent.trim()),
    current: nav.querySelector('[aria-current="page"]')?.textContent.trim() ?? null,
    gaps: nav.querySelectorAll('span[aria-hidden="true"]').length,
    prevDisabled: nav.querySelector('button')?.disabled,
    nextDisabled: [...nav.querySelectorAll('button')].pop()?.disabled,
    aria: [...nav.querySelectorAll('button')].map(b => b.getAttribute('aria-label')),
  }
})()`)

await goto('http://localhost:3000/cards')
const out = {}
out.total = await evaluate(`[...document.querySelectorAll('main *')].map(e => e.textContent).find(t => /^共 \\d+ 张$/.test(t?.trim() ?? ''))?.trim()`)
out.p1 = await readPager()

// 点第 3 页
await evaluate(`[...document.querySelectorAll('nav[aria-label="分页"] button')].find(b => b.textContent.trim() === '3').click()`)
await sleep(1500)
out.afterClick3 = await evaluate('location.search')
out.p3 = await readPager()
out.p3FirstCardNames = await evaluate(`[...document.querySelectorAll('main a[href^="/cards/"]')].slice(0,3).map(a => a.textContent.trim().slice(0,20))`)

// 翻页时保留筛选
await goto('http://localhost:3000/cards?ip=1&hv=true&min=50')
out.filteredPager = await readPager()
await evaluate(`[...document.querySelectorAll('nav[aria-label="分页"] button')].find(b => b.textContent.trim() === '2')?.click()`)
await sleep(1500)
out.filteredAfterPage2 = await evaluate('location.search')

// 首末页箭头禁用态
await goto('http://localhost:3000/cards?page=1')
out.firstPageArrows = await readPager()
await goto('http://localhost:3000/cards?page=3')
out.lastPageArrows = await readPager()

// 窄屏分页不溢出
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true })
await goto('http://localhost:3000/cards')
out.mobileOverflow = await evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
out.mobilePagerButtons = await evaluate(`document.querySelectorAll('nav[aria-label="分页"] button').length`)

// 首页高价买取 + 公告在 3 页数据下的稳定性
await goto('http://localhost:3000/')
out.homeHighValueStill3 = await evaluate(`(() => {
  const s = [...document.querySelectorAll('main section')].find(e => e.textContent.trim().startsWith('高价买取'))
  return s ? s.querySelectorAll('a[href^="/cards/"]').length : 0
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
