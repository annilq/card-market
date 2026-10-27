import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9333)
await cdp.setViewport({ width: 1440, height: 900, mobile: false })
const out = {}
for (const p of ['/', '/cards']) {
  await cdp.goto('http://localhost:3100' + p, { settle: 1200 })
  out['firstPaint' + p] = await cdp.evaluate(`(() => {
    const g = [...document.querySelectorAll('main div')].find(d => d.className.includes('grid-cols-2'))
    return g ? { cls: g.className, animation: getComputedStyle(g).animationName } : null
  })()`)
}
// 改一次筛选后应带入场动画
await cdp.goto('http://localhost:3100/cards', { settle: 1200 })
await cdp.evaluate(`(() => {
  const sel = document.querySelector('main select')
  sel.value = 'price_asc'
  sel.dispatchEvent(new Event('change', { bubbles: true }))
})()`)
await new Promise(r => setTimeout(r, 900))
out.afterFilter = await cdp.evaluate(`(() => {
  const g = [...document.querySelectorAll('main div')].find(d => d.className.includes('grid-cols-2'))
  return g ? { cls: g.className.slice(0, 60), animation: getComputedStyle(g).animationName } : null
})()`)
console.log(JSON.stringify(out, null, 1))
process.exit(0)
