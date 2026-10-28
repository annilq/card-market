// 首页 / 门店页：对真实渲染做几何与色值断言，期望值来自设计图量测。
import { connect } from '/Users/annilq/Documents/develop/card-market/.scratch/mobile-audit/lib/cdp.mjs'
const BASE = process.argv[2] ?? 'http://localhost:3100'
const cdp = await connect(9340)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, got, want, tol = 1) => {
  const ok = typeof want === 'number' ? Math.abs(got - want) <= tol : String(got) === String(want)
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${got}${ok ? '' : ` (want ${want})`}`)
}

await cdp.setViewport({ width: 1920, height: 1000, mobile: false, deviceScaleFactor: 1 })
await cdp.goto(BASE + '/', { settle: 900 })
await cdp.evaluate(`localStorage.setItem('theme','light')`)
await cdp.goto(BASE + '/', { settle: 1200 })
await sleep(400)

const home = JSON.parse(await cdp.evaluate(`(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),top:Math.round(b.top),bottom:Math.round(b.bottom)} }
  const tabs = [...document.querySelectorAll('main button[aria-pressed]')]
  const active = tabs.find((b) => b.getAttribute('aria-pressed') === 'true')
  const banner = document.querySelector('main section')
  const bar = document.querySelector('main h2')?.parentElement
  return JSON.stringify({
    tabCount: tabs.length,
    tabH: r(active)?.h,
    tabBg: active ? getComputedStyle(active).backgroundColor : null,
    tabColor: active ? getComputedStyle(active).color : null,
    bannerBottom: r(banner)?.bottom,
    barTop: r(bar)?.top,
    barBg: bar ? getComputedStyle(bar).backgroundColor : null,
    barH: r(bar)?.h,
    barW: r(bar)?.w,
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  })
})()`))
console.log('home:', home)
check('IP tab 数量 ≥ 2', home.tabCount >= 2, true)
check('tab 高 40', home.tabH, 40)
check('tab 底色 = 品牌红', home.tabBg, 'rgb(219, 38, 29)')
check('tab 文字白', home.tabColor, 'rgb(255, 255, 255)')
check('banner 与通知条紧邻(≤2px)', home.barTop - home.bannerBottom, 0, 2)
check('通知条高 40', home.barH, 40)
check('通知条宽 1200', home.barW, 1200)
check('首页无横向溢出', home.sw <= home.iw + 1, true)

await cdp.goto(BASE + '/shops', { settle: 1500 })
await sleep(600)
const shops = JSON.parse(await cdp.evaluate(`(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)} }
  const asp = [...document.querySelectorAll('main [class*="aspect-"]')]
  const hero = asp.find((e) => e.className.includes('960/598')) || null
  const map = asp.find((e) => e.className.includes('540/318')) || null
  const grid = (hero || map)?.closest('div.grid')
  const rightCol = grid?.children[1]
  return JSON.stringify({
    hasHero: !!hero,
    hero: r(hero), map: r(map),
    hasHeroImg: !!(hero && hero.querySelector('img')),
    mapInRightCol: !!(rightCol && map && rightCol.contains(map)),
    rightColW: r(rightCol)?.w,
    gap: grid ? getComputedStyle(grid).columnGap : null,
    hoursShown: /营业|営業|Hours/.test(document.body.innerText),
    sw: document.documentElement.scrollWidth, iw: window.innerWidth,
  })
})()`))
console.log('shops:', shops)
check('左图位存在', shops.hasHero, true)
check('左图宽高比 1.605', Number((shops.hero.w / shops.hero.h).toFixed(2)), 1.61, 0.03)
check('地图在右列内', shops.mapInRightCol, true)
check('地图宽高比 1.698', Number((shops.map.w / shops.map.h).toFixed(2)), 1.70, 0.03)
check('双列间距 61px', parseInt(shops.gap), 61)
check('营业时间渲染', shops.hoursShown, true)
check('门店页无横向溢出', shops.sw <= shops.iw + 1, true)
console.log(shops.hasHeroImg ? 'NOTE  门店照片已上传，左列显示实拍图 + 营业时间覆层' : 'NOTE  当前数据没有门店照片 → 左列显示「暂无图片」占位，骨架仍是左图/右信息+地图')

console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
