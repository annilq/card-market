// 视觉基线截图：7 个页面 × 1440/390 × 浅色/深色。
// 主题通过 localStorage 在导航前设定，避免截到过渡中间态。
import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const OUT = new URL('./shots/', import.meta.url).pathname
const cdp = await connect(9333)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PAGES = [
  ['home', '/'],
  ['cards', '/cards'],
  ['card-detail', '/cards/1'],
  ['announcements', '/announcements'],
  ['announcement-detail', '/announcements/1'],
  ['message', '/message'],
  ['shops', '/shops'],
]
const VIEWS = [
  ['1440', { width: 1440, height: 900, mobile: false }],
  ['390', { width: 390, height: 844, mobile: true }],
]

for (const [vpId, vp] of VIEWS) {
  await cdp.setViewport(vp)
  for (const theme of ['light', 'dark']) {
    await cdp.evaluate(`localStorage.setItem('theme', ${JSON.stringify(theme)})`)
    for (const [id, path] of PAGES) {
      await cdp.goto(BASE + path, { settle: 1200 })
      await cdp.evaluate(`document.documentElement.classList.toggle('dark', localStorage.getItem('theme')==='dark')`)
      await sleep(400)
      await cdp.screenshot(`${OUT}${id}-${vpId}-${theme}.png`)
      console.log(`${id} ${vpId} ${theme}`)
    }
  }
}
console.log('done')
process.exit(0)
