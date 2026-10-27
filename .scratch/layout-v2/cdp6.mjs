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
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(1400) }
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
const snap = () => evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="分页"]')
  if (!nav) return null
  return [...nav.children[0].children].map(c => c.tagName === 'BUTTON' ? (c.getAttribute('aria-current') ? '['+c.textContent.trim()+']' : c.textContent.trim()) : '…').join(' ')
})()`)
const out = {}
for (const p of [1, 3, 4, 5, 8, 9]) {
  await goto('http://localhost:3000/cards?page=' + p)
  out['page' + p] = await snap()
}
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true })
await goto('http://localhost:3000/cards?page=9')
out.mobileLastPage = await snap()
out.mobileOverflow = await evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
console.log(JSON.stringify(out, null, 1))
ws.close()
