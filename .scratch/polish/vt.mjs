import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9333)
await cdp.setViewport({ width: 1440, height: 900, mobile: false })
await cdp.goto('http://localhost:3100/cards', { settle: 1500 })
const out = await cdp.evaluate(`(async () => {
  const res = { hasApi: typeof document.startViewTransition === 'function' }
  // 监听转场：点击第一张卡后立刻检查是否进入了 view-transition 状态
  const link = document.querySelector('main a[href^="/cards/"]')
  res.linkHasVt = !!link
  let started = false
  const orig = document.startViewTransition
  if (orig) {
    document.startViewTransition = function (...args) {
      started = true
      return orig.apply(this, args)
    }
  }
  link.click()
  await new Promise(r => setTimeout(r, 900))
  res.transitionStarted = started
  res.url = location.pathname
  res.detailVtName = document.querySelector('.vt-card')?.style.getPropertyValue('--vt-name')
  return res
})()`)
console.log(JSON.stringify(out, null, 1))
process.exit(0)
