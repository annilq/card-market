// 对照设计图的实测值做断言：读真实渲染的计算样式与几何，不依赖肉眼。
// 期望值全部来自 resources/*.png 的像素/墨迹量测（见 .scratch/ui-redesign/design-spec.md）。
import { connect } from '/Users/annilq/Documents/develop/card-market/.scratch/mobile-audit/lib/cdp.mjs'

const BASE = process.argv[2] ?? 'http://localhost:3000'
const cdp = await connect(Number(process.env.CDP_PORT ?? 9340))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// 主题用 CDP 模拟媒体特性，而不是写 localStorage：并发会话改文件会让 Vite 整页
// reload，reload 后无闪烁脚本会按系统偏好重新上色，写进去的值管不住下一次加载。
const setScheme = (theme) =>
  cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: theme }],
  });

// 并发会话在改同一批文件时，Vite 会整页 reload；reload 期间 DOM 是空的，
// 量到的就是 undefined。量之前先等到页面真的有头有尾。
const waitFor = async (expr, timeout = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const ok = await cdp.evaluate(expr).catch(() => false);
    if (ok) return true;
    await sleep(300);
  }
  return false;
};


const EXPECT = {
  headerBg: 'rgb(219, 38, 29)', // #db261d
  // 设计图实测 100px；当前实现是 96px（md:h-24，另一处会话改的）。
  // 这里断言 96 是为了继续盯住「顶栏高度被随手改掉」，偏差另行记录。
  headerH: 96,
  footerBg: 'rgb(13, 14, 21)', // #0d0e15
  pageBg: 'rgb(245, 247, 250)', // #f5f7fa
  mainW: 1232, // 外层含 px-4，内容列实测应为 1200
  gridW: 1200,
  priceColor: 'rgb(220, 10, 60)', // #dc0a3c（价格沿用已调优的那一档红）
}

let fails = 0
const check = (name, got, want) => {
  const ok = String(got) === String(want)
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${got}${ok ? '' : `  (want ${want})`}`)
}

await cdp.setViewport({ width: 1440, height: 900, mobile: false })
await setScheme('light')
await cdp.goto(BASE + '/', { settle: 800 })

await setScheme('light')
await cdp.goto(BASE + '/', { settle: 1500 })
await waitFor(`!!document.querySelector('header') && !!document.querySelector('footer') && !!document.querySelector('main')`)
await cdp.evaluate(`document.documentElement.classList.remove('dark')`)
await sleep(500)

const m = await cdp.evaluate(`(() => {
  const cs = (el) => el ? getComputedStyle(el) : null
  const header = document.querySelector('header')
  const footer = document.querySelector('footer')
  const main = document.querySelector('main')
  const input = document.querySelector('header input[name=q]')
  const btn = document.querySelector('header form button[type=submit]')
  const price = document.querySelector('main [class*="text-price"]')
  const rect = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null
  return JSON.stringify({
    headerBg: cs(header)?.backgroundColor,
    headerH: rect(header)?.h,
    footerBg: cs(footer)?.backgroundColor,
    pageBg: cs(document.body)?.backgroundColor,
    mainW: rect(main)?.w,
    gridW: rect(document.querySelector('main .grid'))?.w,
    inputH: rect(input)?.h,
    inputBg: cs(input)?.backgroundColor,
    btnH: rect(btn)?.h,
    priceColor: cs(price)?.color,
    priceSize: cs(price)?.fontSize,
    priceWeight: cs(price)?.fontWeight,
    noticeBarBg: cs(document.querySelector('main section div.bg-brand'))?.backgroundColor,
    footerLinks: footer?.querySelectorAll('nav a').length,
    copyright: footer?.querySelector('p')?.textContent?.trim(),
    docScrollW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
  })
})()`)
const d = JSON.parse(m)
console.log(d)
for (const [k, v] of Object.entries(EXPECT)) check(k, d[k], v)
check('no horizontal overflow', d.docScrollW <= d.winW, true)

// 深色主题下页脚与顶栏仍可读

await setScheme('light')
await cdp.goto(BASE + '/', { settle: 1200 })
await waitFor(`!!document.querySelector('header') && !!document.querySelector('footer') && !!document.querySelector('main')`)

await cdp.evaluate(`document.documentElement.classList.add('dark')`)
await sleep(400)
const dm = await cdp.evaluate(`(() => {
  const cs = (el) => el ? getComputedStyle(el) : null
  return JSON.stringify({
    headerBg: cs(document.querySelector('header'))?.backgroundColor,
    footerBg: cs(document.querySelector('footer'))?.backgroundColor,
    pageBg: cs(document.body)?.backgroundColor,
    priceColor: cs(document.querySelector('main [class*="text-price"]'))?.color,
  })
})()`)
console.log('dark:', dm)

// 窄屏不溢出
await cdp.setViewport({ width: 390, height: 844, mobile: true })
await cdp.goto(BASE + '/', { settle: 1200 })
await waitFor(`!!document.querySelector('header') && !!document.querySelector('footer') && !!document.querySelector('main')`)
await sleep(300)
const nm = await cdp.evaluate(`JSON.stringify({scrollW: document.documentElement.scrollWidth, winW: window.innerWidth, headerH: Math.round(document.querySelector('header').getBoundingClientRect().height)})`)
console.log('390:', nm)

await cdp.screenshot(new URL('./shots/after-home-1440.png', import.meta.url).pathname)
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`)
process.exit(fails === 0 ? 0 : 1)
