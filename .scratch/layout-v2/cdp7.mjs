const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res) => ws.addEventListener('open', res, { once: true }))
let id = 0
const pending = new Map()
const consoleErrors = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push('EXC ' + (m.params.exceptionDetails.text ?? ''))
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300))
  return r.result?.result?.value
}
await send('Runtime.enable')
const goto = async (url) => { await send('Page.navigate', { url }); await sleep(1500) }

const out = {}
for (const w of [390, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 })
  for (const p of ['/', '/cards', '/cards/1', '/announcements', '/shops', '/message', '/ja/', '/en/cards']) {
    await goto('http://localhost:3000' + p)
    const r = await evaluate(`(() => ({
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerH: Math.round(document.querySelector('header').getBoundingClientRect().height),
      sections: [...document.querySelectorAll('main section h2')].map(h => h.textContent.trim()),
      searchVisible: [...document.querySelectorAll('header input[name="q"]')].some(i => i.getBoundingClientRect().width > 0),
    }))()`)
    out[`${w}${p}`] = r
  }
}
out.errors = consoleErrors.filter((e) => !/favicon|assets\/|404 \(Not Found\)/i.test(e)).slice(0, 10)
console.log(JSON.stringify(out, null, 1))
ws.close()
