import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const OUT = new URL('./shots/', import.meta.url).pathname
const cdp = await connect(9333)
await cdp.evaluate("localStorage.setItem('theme','light')")
for (const [w, h, m, tag] of [[1440, 900, false, '1440'], [390, 844, true, '390']]) {
  await cdp.setViewport({ width: w, height: h, mobile: m })
  await cdp.goto('http://localhost:3100/info/terms', { settle: 1200 })
  await cdp.evaluate("document.documentElement.classList.remove('dark')")
  await new Promise(r => setTimeout(r, 250))
  await cdp.screenshot(`${OUT}info-terms-${tag}.png`)
}
console.log('done')
process.exit(0)
