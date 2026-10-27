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

// ip=1 且 排序=价格升序，再翻页：筛选与排序都必须保留
await goto('http://localhost:3000/cards?ip=1&sort=price_asc')
const out = {}
out.before = await evaluate('location.search')
out.pager = await evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="分页"]')
  return nav ? [...nav.querySelectorAll('button')].map(b => b.textContent.trim()) : null
})()`)
await evaluate(`[...document.querySelectorAll('nav[aria-label="分页"] button')].find(b => b.textContent.trim() === '2').click()`)
await sleep(1600)
out.afterPage2 = await evaluate('location.search')
out.pricesOnPage2 = await evaluate(`[...document.querySelectorAll('main a[href^="/cards/"]')].slice(0,4).map(a => (a.textContent.match(/¥[\\d.]+/) ?? [''])[0])`)

// 语言切换后分页文案
await goto('http://localhost:3000/ja/cards?page=2')
out.ja = await evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="ページ送り"]')
  return nav ? { aria: [...nav.querySelectorAll('button')].map(b => b.getAttribute('aria-label')), cur: nav.querySelector('[aria-current]')?.textContent.trim() } : null
})()`)
await goto('http://localhost:3000/en/cards?page=2')
out.en = await evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="Pagination"]')
  return nav ? { aria: [...nav.querySelectorAll('button')].map(b => b.getAttribute('aria-label')), cur: nav.querySelector('[aria-current]')?.textContent.trim() } : null
})()`)
console.log(JSON.stringify(out, null, 1))
ws.close()
