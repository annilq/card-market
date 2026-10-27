import { connect } from '../../../../.scratch/mobile-audit/lib/cdp.mjs'
const OUT = new URL('./shots/', import.meta.url).pathname
const cdp = await connect(9333)
await cdp.evaluate("localStorage.setItem('theme','light')")
await cdp.setViewport({ width: 1440, height: 900, mobile: false })
await cdp.goto('http://localhost:3100/?ip=1&type=raw&sort=price_asc', { settle: 1400 })
await cdp.evaluate("document.documentElement.classList.remove('dark')")
await new Promise(r => setTimeout(r, 300))
const out = await cdp.evaluate(`(() => {
  const chips = [...document.querySelectorAll('main button')].filter(b => b.className.includes('rounded-full'))
  const reset = [...document.querySelectorAll('main button')].find(b => b.textContent.trim() === '重置')
  return {
    chips: chips.map(c => c.textContent.trim()),
    resetDisabled: reset?.disabled,
    // 结果计数行里不应再有第二个「清空」
    clearAllCount: [...document.querySelectorAll('main button')].filter(b => b.textContent.trim() === '清空').length,
  }
})()`)
// 点掉一个 chip
out.afterChipRemove = await cdp.evaluate(`(async () => {
  const chip = [...document.querySelectorAll('main button')].find(b => b.className.includes('rounded-full'))
  chip.click()
  await new Promise(r => setTimeout(r, 800))
  return { url: location.search, chips: [...document.querySelectorAll('main button')].filter(b => b.className.includes('rounded-full')).map(c=>c.textContent.trim()) }
})()`)
console.log(JSON.stringify(out, null, 1))
process.exit(0)
