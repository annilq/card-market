const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res) => ws.addEventListener('open', res, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails))
  return r.result?.result?.value
}

for (const w of [390, 768, 1024, 1280, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 })
  await send('Page.navigate', { url: 'http://localhost:3000/cards' })
  await sleep(1200)
  const r = await evaluate(`(() => {
    const de = document.documentElement
    const header = document.querySelector('header')
    const inputs = [...document.querySelectorAll('header input[name="q"]')]
    const visible = inputs.filter(i => i.getBoundingClientRect().width > 0)
    const v = visible[0]
    const vr = v?.getBoundingClientRect()
    const form = v?.closest('form')
    const row1 = header?.querySelector('.h-14')
    const kids = row1 ? [...row1.children].map(c => ({ cls: c.className.slice(0, 60), w: Math.round(c.getBoundingClientRect().width) })) : []
    return {
      overflowX: de.scrollWidth - de.clientWidth,
      headerH: Math.round(header.getBoundingClientRect().height),
      inputsTotal: inputs.length,
      visibleInputs: visible.length,
      inputW: vr ? Math.round(vr.width) : null,
      inputX: vr ? Math.round(vr.x) : null,
      formW: form ? Math.round(form.getBoundingClientRect().width) : null,
      row1Kids: kids,
      pagination: !!document.querySelector('nav[aria-label] button[aria-current]'),
      sidebarTop: getComputedStyle(document.querySelector('aside')).top,
    }
  })()`)
  console.log(w, JSON.stringify(r))
}
ws.close()
