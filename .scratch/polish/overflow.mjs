import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9333)
const PAGES = ['/', '/cards', '/cards/1', '/announcements', '/announcements/1', '/message', '/shops', '/info/terms']
const out = []
for (const w of [320, 360, 390, 768, 1024, 1440]) {
  await cdp.setViewport({ width: w, height: 900, mobile: w < 768 })
  for (const p of PAGES) {
    cdp.resetErrors()
    await cdp.goto('http://localhost:3100' + p, { settle: 900 })
    const r = await cdp.evaluate(`(() => {
      const de = document.documentElement
      return { sw: de.scrollWidth, cw: de.clientWidth, vw: Math.round(window.visualViewport?.width ?? 0) }
    })()`)
    out.push({ w, p, overflow: r.sw > r.cw + 1, ...r })
  }
}
const bad = out.filter(o => o.overflow)
console.log(JSON.stringify({ checked: out.length, overflowCount: bad.length, bad }, null, 1))
process.exit(0)
