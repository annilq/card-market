import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const OUT = new URL('./shots/', import.meta.url).pathname
const cdp = await connect(9333)
await cdp.evaluate("localStorage.setItem('theme','light')")
await cdp.setViewport({ width: 1440, height: 900, mobile: false })
await cdp.goto('http://localhost:3100/cards/1?x=1', { settle: 1600 })
await cdp.evaluate("document.documentElement.classList.remove('dark')")
await new Promise(r => setTimeout(r, 400))
const out = await cdp.evaluate(`(() => {
  const thumbs = [...document.querySelectorAll('button[aria-label*="图片"]')]
  return { thumbs: thumbs.length, current: thumbs.map(t => t.getAttribute('aria-current')) }
})()`)
await cdp.evaluate(`document.querySelector('[role=group]')?.focus()`)
for (const key of ['ArrowRight','ArrowRight']) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: 39 })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: 39 })
  await new Promise(r => setTimeout(r, 250))
}
out.afterArrow = await cdp.evaluate(`[...document.querySelectorAll('button[aria-label*="图片"]')].map(t=>t.getAttribute('aria-current'))`)
await cdp.screenshot(OUT + 'card-detail-gallery.png')
console.log(JSON.stringify(out, null, 1))
process.exit(0)
