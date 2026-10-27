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
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400))
  return r.result?.result?.value
}
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(1400) }

await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })

const out = {}
// 1. 从列表页带筛选搜索：搜索后筛选是否保留、page 是否重置
await goto('http://localhost:3000/cards?ip=1&hv=1&page=1')
out.beforeSearch = await evaluate('location.search')
out.typed = await evaluate(`(() => {
  const i = [...document.querySelectorAll('header input[name="q"]')].find(x => x.getBoundingClientRect().width > 0)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(i, '皮卡')
  const f = i.closest('form')
  f.requestSubmit()
  return true
})()`)
await sleep(1600)
out.afterSearch = await evaluate('location.search')
out.afterSearchInputValue = await evaluate(`(() => {
  const i = [...document.querySelectorAll('header input[name="q"]')].find(x => x.getBoundingClientRect().width > 0)
  return i?.value
})()`)
out.resultCount = await evaluate(`(() => {
  const t = [...document.querySelectorAll('main *')].map(e => e.textContent).find(t => /^共 \\d+ 张$/.test(t?.trim() ?? ''))
  return t?.trim() ?? null
})()`)
out.cardLinks = await evaluate(`document.querySelectorAll('main a[href^="/cards/"]').length`)

// 2. 稀有度关键词：搜 HR 应命中稀有度为 HR 的卡
await goto('http://localhost:3000/cards?q=HR')
out.raritySearchCount = await evaluate(`(() => {
  const t = [...document.querySelectorAll('main *')].map(e => e.textContent).find(t => /^共 \\d+ 张$/.test(t?.trim() ?? ''))
  return t?.trim() ?? null
})()`)

// 3. 分页与筛选共存（把每页改成小页再翻页不现实，直接断言 URL 契约）
await goto('http://localhost:3000/cards?ip=1&hv=1')
out.paginationRendered = await evaluate(`!!document.querySelector('nav[aria-label] button[aria-current]')`)
out.hvCheckbox = await evaluate(`(() => {
  const l = [...document.querySelectorAll('aside label')].find(e => e.textContent.includes('高价买取'))
  return l ? l.querySelector('input')?.checked : null
})()`)

// 4. 首页高价买取「全部」链接
await goto('http://localhost:3000/')
out.highValueAllHref = await evaluate(`(() => {
  const s = [...document.querySelectorAll('main section')].find(e => e.textContent.trim().startsWith('高价买取'))
  return s?.querySelector('a')?.getAttribute('href') ?? null
})()`)
out.highValueCards = await evaluate(`(() => {
  const s = [...document.querySelectorAll('main section')].find(e => e.textContent.trim().startsWith('高价买取'))
  return [...(s?.querySelectorAll('a[href^="/cards/"]') ?? [])].map(a => a.getAttribute('href'))
})()`)

// 5. 语言切换后搜索链接与占位符
for (const [loc, path] of [['ja', '/ja/cards'], ['en', '/en/cards']]) {
  await goto('http://localhost:3000' + path)
  out[loc] = await evaluate(`(() => {
    const i = [...document.querySelectorAll('header input[name="q"]')].find(x => x.getBoundingClientRect().width > 0)
    return { placeholder: i?.placeholder, btn: document.querySelector('header form button[type=submit]')?.textContent }
  })()`)
}
console.log(JSON.stringify(out, null, 1))
ws.close()
