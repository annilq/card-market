import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const OUT = new URL('./shots/', import.meta.url).pathname
const cdp = await connect(9333)
await cdp.setViewport({ width: 390, height: 844, mobile: true })
await cdp.evaluate("localStorage.setItem('theme','light')")
await cdp.goto('http://localhost:3100/cards?ip=1', { settle: 1200 })
await cdp.evaluate("document.documentElement.classList.remove('dark')")
const y0 = await cdp.evaluate(`Math.round(document.querySelector('main a[href^="/cards/"]').getBoundingClientRect().top)`)
await cdp.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('筛选')).click()`)
await new Promise(r => setTimeout(r, 350))
await cdp.screenshot(OUT + 'cards-390-light-filter-open.png')
const info = await cdp.evaluate(`(() => {
  const aside = document.querySelector('aside')
  const panel = [...document.querySelectorAll('div')].find(d => d.className.includes('mb-4 rounded-xl'))
  return {
    asideRendered: !!aside,
    asideRect: aside ? { w: Math.round(aside.getBoundingClientRect().width), h: Math.round(aside.getBoundingClientRect().height) } : null,
    panelPresent: !!panel,
    checkboxes: document.querySelectorAll('input[type=checkbox]').length,
  }
})()`)
console.log(JSON.stringify({ firstCardYBeforeOpen: y0, ...info }, null, 1))
process.exit(0)
