import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9333)
const SEL = 'button[aria-label*="banner"]'
const read = `[...document.querySelectorAll('${SEL}')].map(b=>b.getAttribute('aria-current'))`
const out = {}

await cdp.setViewport({ width: 390, height: 844, mobile: true })
await cdp.evaluate(`document.documentElement.classList.remove('dark')`)

await cdp.send('Emulation.setEmulatedMedia', { features: [] })
await cdp.goto('http://localhost:3100/', { settle: 1000 })
out.dots = await cdp.evaluate(`document.querySelectorAll('${SEL}').length`)
out.normalBefore = await cdp.evaluate(read)
await new Promise(r => setTimeout(r, 6000))
out.normalAfter = await cdp.evaluate(read)
out.normalAdvanced = JSON.stringify(out.normalBefore) !== JSON.stringify(out.normalAfter)

await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
await cdp.goto('http://localhost:3100/', { settle: 1000 })
out.reducedBefore = await cdp.evaluate(read)
await new Promise(r => setTimeout(r, 6000))
out.reducedAfter = await cdp.evaluate(read)
out.reducedStayed = JSON.stringify(out.reducedBefore) === JSON.stringify(out.reducedAfter)

out.clickWorks = await cdp.evaluate(`(async () => {
  const dots = [...document.querySelectorAll('${SEL}')]
  dots[2].click()
  await new Promise(r => setTimeout(r, 300))
  return [...document.querySelectorAll('${SEL}')].map(b=>b.getAttribute('aria-current'))
})()`)

out.dotHitArea = await cdp.evaluate(`(() => {
  const b = document.querySelector('${SEL}')
  const r = b.getBoundingClientRect()
  return { w: Math.round(r.width), h: Math.round(r.height) }
})()`)

await cdp.send('Emulation.setEmulatedMedia', { features: [] })
console.log(JSON.stringify(out, null, 1))
process.exit(0)
