import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const OUT = new URL('./shots/', import.meta.url).pathname
const cdp = await connect(9333)
await cdp.setViewport({ width: 390, height: 844, mobile: true })
await cdp.evaluate("localStorage.setItem('theme','dark')")
await cdp.goto('http://localhost:3100/cards/1', { settle: 1400 })
await cdp.evaluate("document.documentElement.classList.add('dark')")
await new Promise(r => setTimeout(r, 300))
// 首屏
await cdp.screenshot(OUT + 'card-detail-390-dark-viewport.png', { fullPage: false })
// 滚到描述底部，确认粘性条不遮挡内容
await cdp.evaluate(`window.scrollTo(0, document.body.scrollHeight)`)
await new Promise(r => setTimeout(r, 500))
await cdp.screenshot(OUT + 'card-detail-390-dark-bottom.png', { fullPage: false })
const info = await cdp.evaluate(`(() => {
  const bar = [...document.querySelectorAll('main div')].find(d => d.className.includes('fixed') && d.className.includes('bottom-0'))
  const r = bar.getBoundingClientRect()
  const desc = [...document.querySelectorAll('main p')].pop()
  const dr = desc.getBoundingClientRect()
  return {
    barTop: Math.round(r.top), barHeight: Math.round(r.height), viewportH: innerHeight,
    lastParagraphBottom: Math.round(dr.bottom),
    overlap: dr.bottom > r.top,
  }
})()`)
console.log(JSON.stringify(info, null, 1))
process.exit(0)
