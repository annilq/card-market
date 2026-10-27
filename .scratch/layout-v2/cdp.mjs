// 用 CDP 在真实浏览器里量 DOM，而不是靠截图猜。
const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targets() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await r.json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page
    } catch {}
    await sleep(250)
  }
  throw new Error('chrome 未就绪')
}

const page = await targets()
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res) => ws.addEventListener('open', res, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
})
const send = (method, params = {}) =>
  new Promise((res) => {
    const mid = ++id
    pending.set(mid, res)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails))
  return r.result?.result?.value
}
const goto = async (url) => {
  await send('Page.navigate', { url })
  await sleep(1200)
}

const WIDTHS = [390, 768, 1440]
const PAGES = ['/', '/cards', '/ja/cards', '/en/']
const report = []
for (const w of WIDTHS) {
  for (const p of PAGES) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600,
    })
    await goto('http://localhost:3000' + p)
    const r = await evaluate(`(() => {
      const de = document.documentElement
      const header = document.querySelector('header')
      const input = document.querySelector('header input[name="q"]')
      const hamburger = document.querySelector('header button[aria-expanded]')
      const hr = header?.getBoundingClientRect()
      const ir = input?.getBoundingClientRect()
      const hb = hamburger?.getBoundingClientRect()
      return {
        overflowX: de.scrollWidth - de.clientWidth,
        headerH: hr ? Math.round(hr.height) : null,
        searchVisible: !!input && ir.width > 0 && ir.height > 0,
        searchBox: input ? { x: Math.round(ir.x), w: Math.round(ir.width), y: Math.round(ir.y) } : null,
        hamburgerInViewport: hb ? hb.right <= de.clientWidth + 1 && hb.width > 0 : null,
        searchBtnText: document.querySelector('header form button[type="submit"]')?.textContent,
      }
    })()`)
    report.push({ w, p, ...r })
  }
}
console.log(JSON.stringify(report, null, 1))
ws.close()
