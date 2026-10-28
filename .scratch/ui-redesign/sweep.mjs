// 全站烟测：7 页 × 1440/390 × 浅/深，查横向溢出与控制台报错。
import { connect } from '/Users/annilq/Documents/develop/card-market/.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9340)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const BASE = 'http://localhost:3100'
const PAGES = ['/', '/cards', '/cards/1', '/announcements', '/announcements/1', '/message', '/shops', '/info/terms']
let bad = 0
for (const vp of [{ width: 1440, height: 900, mobile: false }, { width: 390, height: 844, mobile: true }, { width: 320, height: 640, mobile: true }]) {
  await cdp.setViewport(vp)
  await cdp.goto(BASE + '/', { settle: 600 })
  for (const theme of ['light', 'dark']) {
    await cdp.evaluate(`localStorage.setItem('theme', ${JSON.stringify(theme)})`)
    for (const path of PAGES) {
      cdp.resetErrors()
      await cdp.goto(BASE + path, { settle: 900 })
      await sleep(250)
      const r = await cdp.evaluate(`JSON.stringify({sw: document.documentElement.scrollWidth, iw: window.innerWidth, header: !!document.querySelector('header'), footer: !!document.querySelector('footer')})`)
      const d = JSON.parse(r)
      const overflow = d.sw > d.iw + 1
      const errs = cdp.consoleErrors.filter((e) => !/favicon|Failed to load resource/.test(e))
      if (overflow || errs.length) {
        bad++
        console.log(`FAIL ${vp.width} ${theme} ${path} overflow=${overflow} (${d.sw}>${d.iw}) errors=${errs.slice(0, 2).join(' | ')}`)
      }
    }
  }
}
console.log(bad === 0 ? 'SWEEP OK (3 widths × 2 themes × 8 pages)' : `${bad} problems`)
process.exit(0)
