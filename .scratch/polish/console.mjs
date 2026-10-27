import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9333)
const PAGES = ['/', '/cards', '/cards/1', '/cards/1280', '/announcements', '/announcements/1', '/message', '/shops', '/info/terms', '/ja/cards', '/en/announcements', '/nope']
const problems = []
await cdp.setViewport({ width: 1440, height: 900, mobile: false })
for (const p of PAGES) {
  cdp.resetErrors()
  await cdp.goto('http://localhost:3100' + p, { settle: 1100 })
  const errs = [...cdp.consoleErrors]
  const fails = [...cdp.networkFailures]
  // 404 页面本身的 404 文档响应不算错误
  const realFails = fails.filter(f => !(p === '/nope' && f.includes('/nope')))
  if (errs.length || realFails.length) problems.push({ p, errs, realFails })
}
console.log(JSON.stringify({ pages: PAGES.length, problems }, null, 1))
process.exit(0)
