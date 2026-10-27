// 极简 CDP 客户端：连到已经以 --remote-debugging-port 起的 headless Chrome。
// 只覆盖本次移动端验收需要的部分（导航 / 设备模拟 / 求值 / 截图 / 控制台收集）。
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function connect(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = list.find((t) => t.type === 'page')
  if (!target) throw new Error('no page target on port ' + port)
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })

  let id = 0
  const pending = new Map()
  const consoleErrors = []
  const networkFailures = []

  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(
        m.params.args.map((a) => a.value ?? a.description ?? '').join(' '),
      )
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails
      const desc = d.exception?.description || d.exception?.value || d.text || ''
      consoleErrors.push('EXC ' + String(desc).split('\n').slice(0, 3).join(' | '))
    }
    if (m.method === 'Network.responseReceived') {
      const { status, url } = m.params.response
      if (status >= 400) networkFailures.push(`${status} ${url}`)
    }
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    }
  })

  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id
      pending.set(mid, res)
      ws.send(JSON.stringify({ id: mid, method, params }))
    })

  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.enable')
  await send('Log.enable')

  async function evaluate(expression) {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.result?.exceptionDetails) {
      throw new Error(
        'evaluate failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400),
      )
    }
    return r.result?.result?.value
  }

  async function setViewport({ width, height, mobile, deviceScaleFactor = 2 }) {
    // 注意：mobile:true 时 Chrome 会按内容把「布局视口」放大（视觉视口不变），
    // clientWidth 因此大于设定宽度，溢出量会被算成 0——这正是最容易被漏掉的假阴性。
    // 用 visualViewport.width 与实际宽度比对，并把两种模式的读数都记下来。
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile,
      screenWidth: width,
      screenHeight: height,
      dontSetVisibleSize: false,
    })
    // 让 matchMedia / touch 也按移动端表现
    await send('Emulation.setTouchEmulationEnabled', {
      enabled: mobile,
      maxTouchPoints: mobile ? 5 : 1,
    })
  }

  async function goto(url, { settle = 900 } = {}) {
    await send('Page.navigate', { url })
    await sleep(settle)
    // 等字体与图片稳定
    await evaluate(
      `Promise.race([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        new Promise(r => setTimeout(r, 1500)),
      ]).then(() => true)`,
    ).catch(() => {})
  }

  async function screenshot(path, { fullPage = true } = {}) {
    const params = { format: 'png', captureBeyondViewport: fullPage }
    if (!fullPage) {
      const m = await send('Page.getLayoutMetrics')
      const vp = m.result.cssVisualViewport
      params.clip = {
        x: 0,
        y: 0,
        width: vp.clientWidth,
        height: vp.clientHeight,
        scale: 1,
      }
    }
    const r = await send('Page.captureScreenshot', params)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, Buffer.from(r.result.data, 'base64'))
  }

  async function click(selector) {
    const ok = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      el.click()
      return true
    })()`)
    if (!ok) throw new Error('click target not found: ' + selector)
    await sleep(350)
  }

  function resetErrors() {
    consoleErrors.length = 0
    networkFailures.length = 0
  }

  return {
    send,
    evaluate,
    setViewport,
    goto,
    screenshot,
    click,
    sleep,
    consoleErrors,
    networkFailures,
    resetErrors,
    close: () => ws.close(),
  }
}
