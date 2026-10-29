// 卡牌弹窗 + 详情页共用信息组件：真点一遍，断言几何、色值、文案与关闭行为。
import { connect } from '/Users/annilq/Documents/develop/card-market/.scratch/mobile-audit/lib/cdp.mjs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const cdp = await connect(Number(process.env.CDP_PORT ?? 9342))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const setScheme = (theme) =>
  cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: theme }],
  })
let fails = 0
const check = (name, got, want, tol = 1) => {
  const ok =
    typeof want === 'number' ? Math.abs(got - want) <= tol : String(got) === String(want)
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${got}${ok ? '' : ` (want ${want})`}`)
}

await setScheme('light')
await cdp.setViewport({ width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 })
await cdp.goto(BASE + '/', { settle: 1500 })
await sleep(600)

const info = () =>
  cdp.evaluate(`(() => {
  const d = document.querySelector('[role=dialog]')
  if (!d) return JSON.stringify({ open: false })
  const panel = d.getBoundingClientRect()
  // 图列就是 img 的父元素：CSS 里转义 / 会报 SyntaxError，别用带转义的类名选择器
  const img = d.querySelector('img')?.parentElement
  const imgBox = img ? img.getBoundingClientRect() : null
  const price = [...d.querySelectorAll('div')].find((e) => /^¥/.test(e.textContent.trim()))
  const badge = d.querySelector('span.rounded-full')
  return JSON.stringify({
    open: true,
    label: d.getAttribute('aria-label'),
    panelW: Math.round(panel.width),
    imgRatio: imgBox ? Number((imgBox.width / panel.width).toFixed(2)) : null,
    text: d.innerText.replace(/\\s+/g, ' ').trim(),
    priceColor: price ? getComputedStyle(price).color : null,
    priceSize: price ? getComputedStyle(price).fontSize : null,
    badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
    detailHref: d.querySelector('a[href*="/cards/"]')?.getAttribute('href'),
  })
})()`)

// 用真实鼠标点：程序化 el.click() 不会让按钮拿到焦点，
// 焦点归还这条就验不出来。
const clickCard = async () => {
  const box = JSON.parse(
    await cdp.evaluate(`(() => {
      const a = document.querySelector('main .grid a[href*="/cards/"]')
      a.scrollIntoView({ block: 'center' })
      const r = a.getBoundingClientRect()
      return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2, href: a.getAttribute('href') })
    })()`),
  )
  await sleep(200)
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 })
  }
  await sleep(400)
  return box.href
}

const href = await clickCard()
let s = JSON.parse(await info())
console.log('modal:', { ...s, text: s.text?.slice(0, 90) })
check('点卡片弹出弹窗', s.open, true)
check('弹窗 aria-label = 卡名', s.label?.length > 0, true)
check('图列占面板 47%', s.imgRatio, 0.47, 0.03)
check('价格色 = 价格红', s.priceColor, 'rgb(220, 10, 60)')
check('价格字号 24px', s.priceSize, '24px')
check('徽章底色 = 品牌红', s.badgeBg, 'rgb(219, 38, 29)')
check('信息列含「名称：」', /名称：/.test(s.text ?? ''), true)
check('信息列含「状态：」', /卡牌状态：/.test(s.text ?? ''), true)
check('有通往详情页的链接', /\/cards\/\d+/.test(s.detailHref ?? ''), true)
// 关掉之后 info() 就不再有内容了，卡名要在还开着的时候留一份
const modalLabel = s.label

// Esc 关闭 + 焦点归还
await cdp.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
await sleep(350)
check('Esc 关闭弹窗', JSON.parse(await info()).open, false)
check(
  '关闭后焦点回到卡片链接',
  await cdp.evaluate(`document.activeElement?.getAttribute('href')?.includes('/cards/') ?? false`),
  true,
)
check('没有跳转（仍在首页）', (await cdp.evaluate(`location.pathname`)), '/')

// 点遮罩关闭
await clickCard()
// 页面上还有别的 aria-hidden（装饰图标），遮罩要用它自己的类选中
await cdp.evaluate(`document.querySelector('[aria-hidden=true].sheet-fade').click()`)
await sleep(350)
check('点遮罩关闭', JSON.parse(await info()).open, false)

// 详情页：同一个信息组件
s = JSON.parse(await info())
await cdp.goto(BASE + href, { settle: 1500 })
await sleep(600)
const page = JSON.parse(
  await cdp.evaluate(`(() => {
    const h1 = document.querySelector('h1')
    const main = document.querySelector('main')
    return JSON.stringify({
      h1: h1?.textContent?.trim(),
      text: main.innerText.replace(/\\s+/g, ' ').trim().slice(0, 300),
    })
  })()`),
)
console.log('detail h1:', page.h1)
check('详情页 h1 = 卡名（与弹窗同一个）', page.h1, modalLabel)
check('详情页也有「名称：」', /名称：/.test(page.text), true)
check('详情页也有「卡牌状态：」', /卡牌状态：/.test(page.text), true)

console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
