import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const cdp = await connect(9333)
await cdp.setViewport({ width: 1440, height: 900, mobile: false })
const out = {}
for (const theme of ['light', 'dark']) {
  await cdp.evaluate(`localStorage.setItem('theme', ${JSON.stringify(theme)})`)
  await cdp.goto('http://localhost:3100/cards', { settle: 1200 })
  await cdp.evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'})`)
  await new Promise(r => setTimeout(r, 300))
  out[theme] = await cdp.evaluate(`(() => {
    const parse = (c) => c.match(/\\d+/g).slice(0,3).map(Number)
    const lin = (v) => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4) }
    const L = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
    const ratio = (a,b) => { const la=L(a), lb=L(b); const hi=Math.max(la,lb), lo=Math.min(la,lb); return (hi+0.05)/(lo+0.05) }
    const pick = (sel) => { const el = document.querySelector(sel); if (!el) return null
      const cs = getComputedStyle(el); return { fg: parse(cs.color), bg: parse(cs.backgroundColor), text: el.textContent.trim().slice(0,20) } }
    // 逐级向上找不透明背景
    const bgOf = (el) => { let n = el; while (n) { const b = getComputedStyle(n).backgroundColor; const a = b.match(/rgba?\\(([^)]+)\\)/); if (a) { const parts = a[1].split(',').map(Number); if (parts.length < 4 || parts[3] > 0.9) return parts.slice(0,3) } n = n.parentElement } return [255,255,255] }
    const rows = []
    for (const sel of ['.text-price', '.text-faint', '.text-vault', 'main .text-muted']) {
      const el = document.querySelector(sel); if (!el) continue
      const cs = getComputedStyle(el)
      rows.push({ sel, text: el.textContent.trim().slice(0,18), ratio: Math.round(ratio(parse(cs.color), bgOf(el))*100)/100 })
    }
    return rows
  })()`)
}
console.log(JSON.stringify(out, null, 1))
process.exit(0)
