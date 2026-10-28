import { connect } from '/Users/annilq/Documents/develop/card-market/.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9340)
await cdp.setViewport({ width: 1920, height: 1000, mobile: false, deviceScaleFactor: 1 })
await cdp.goto('http://localhost:3100/', { settle: 1200 })
const out = await cdp.evaluate(`(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return {x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)} }
  const footer = document.querySelector('footer')
  const main = document.querySelector('main')
  const cs = (el, p) => getComputedStyle(el)[p]
  return JSON.stringify({
    container: r(main),
    headerLogo: r(document.querySelector('header a')),
    searchInput: r(document.querySelector('header input[name=q]')),
    searchBtn: r(document.querySelector('header form button[type=submit]')),
    noticeBar: r(document.querySelector('main h2')?.parentElement),
    footerRect: r(footer),
    footerHeading: r(footer.querySelector('h2')),
    footerHeadingColor: cs(footer.querySelector('h2'), 'color'),
    footerLink: r(footer.querySelector('nav a')),
    footerLinkColor: cs(footer.querySelector('nav a'), 'color'),
    copyright: r(footer.querySelector('p')),
    gridCols: cs(document.querySelector('main .grid'), 'gridTemplateColumns').split(' ').length,
    cardW: r(document.querySelector('main .grid > a'))?.w,
  }, null, 1)
})()`)
console.log(out)
process.exit(0)
