// 基线/回归截图：7 个页面 × 1440/390 × 浅色/深色。
// 主题通过 localStorage 在导航前设定，避免截到过渡中间态。
import { connect } from '/Users/annilq/Documents/develop/card-market/.scratch/mobile-audit/lib/cdp.mjs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const OUT = new URL('./shots/', import.meta.url).pathname
const cdp = await connect(Number(process.env.CDP_PORT ?? 9340))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// 主题用 CDP 模拟媒体特性，而不是写 localStorage：并发会话改文件会让 Vite 整页
// reload，reload 后无闪烁脚本会按系统偏好重新上色，写进去的值管不住下一次加载。
const setScheme = (theme) =>
  cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: theme }],
  });


const PAGES = [
  ['home', '/'],
  ['cards', '/cards'],
  ['card-detail', '/cards/1'],
  ['announcements', '/announcements'],
  ['announcement-detail', '/announcements/1'],
  ['message', '/message'],
  ['shops', '/shops'],
  ['info', '/info/terms'],
]
const VIEWS = [
  ['1440', { width: 1440, height: 900, mobile: false }],
  ['390', { width: 390, height: 844, mobile: true }],
]

for (const [vpId, vp] of VIEWS) {
  await cdp.setViewport(vp)
  for (const theme of ['light', 'dark']) {
    
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
