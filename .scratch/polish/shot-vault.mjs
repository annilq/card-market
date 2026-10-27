import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const OUT = new URL('./shots/', import.meta.url).pathname
const cdp = await connect(9333)
await cdp.evaluate("localStorage.setItem('theme','light')")
await cdp.setViewport({ width: 390, height: 844, mobile: true })
await cdp.goto('http://localhost:3100/cards?sort=price_desc', { settle: 1400 })
await cdp.evaluate("document.documentElement.classList.remove('dark')")
await new Promise(r => setTimeout(r, 300))
await cdp.screenshot(OUT + 'cards-390-light-vault.png')
await cdp.setViewport({ width: 1440, height: 900, mobile: false })
await cdp.goto('http://localhost:3100/cards/1280', { settle: 1400 })
await cdp.screenshot(OUT + 'card-detail-1440-light-vault.png')
console.log('done')
process.exit(0)
