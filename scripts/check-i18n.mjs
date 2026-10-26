#!/usr/bin/env node
// i18n 验收脚本：对运行中的站点逐个语言断言「服务端渲染出来的 HTML」，
// 而不是只看状态码——JS 端翻译会通过 200 检查却根本没进首屏。
// 用法：node scripts/check-i18n.mjs [baseUrl]
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '')

let failed = 0
const pass = (name) => console.log(`  ✓ ${name}`)
const fail = (name, detail) => {
  failed++
  console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`)
}
const assert = (name, ok, detail) => (ok ? pass(name) : fail(name, detail))

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' })
  const body = await res.text()
  return { status: res.status, body }
}

// 断言页面在指定语言下渲染出该语言的标志性文案，且不含其他语言的标志性文案。
// 每条语言的 marker 只取「该页一定有的」：首页有最新上架与留言入口，
// 筛选面板只在 /cards 出现，因此单独断言，避免把页面差异误判成翻译缺失。
const MARKERS = {
  zh: ['最新上架', '留言咨询'],
  ja: ['新着カード', 'お問い合わせ'],
  en: ['Recently added', 'Contact'],
}

const FILTER_MARKERS = {
  zh: '筛选',
  ja: '絞り込み',
  en: 'Filters',
}

function assertLocale(html, locale, { allowOthers = [] } = {}) {
  for (const marker of MARKERS[locale]) {
    assert(`${locale}: 出现「${marker}」`, html.includes(marker))
  }
  for (const other of Object.keys(MARKERS)) {
    if (other === locale || allowOthers.includes(other)) continue
    for (const marker of MARKERS[other]) {
      assert(
        `${locale}: 不应出现 ${other} 的「${marker}」`,
        !html.includes(marker),
      )
    }
  }
}

const PAGES = ['', '/cards', '/cards/1', '/shops', '/message', '/announcements']

console.log(`\n== 首页 / 列表页三语 SSR ==  (${BASE})`)
for (const locale of ['zh', 'ja', 'en']) {
  const prefix = locale === 'zh' ? '' : `/${locale}`
  console.log(`\n[${locale}] ${prefix || '/'}`)
  const home = await get(prefix || '/')
  assert(`${locale}: 首页 200`, home.status === 200, `status=${home.status}`)
  assert(
    `${locale}: <html lang> 正确`,
    home.body.includes(`<html lang="${locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en'}"`),
    home.body.match(/<html[^>]*>/)?.[0],
  )
  assertLocale(home.body, locale)
}

console.log('\n== 各语言下所有页面可达 ==')
for (const locale of ['zh', 'ja', 'en']) {
  const prefix = locale === 'zh' ? '' : `/${locale}`
  for (const page of PAGES) {
    const path = `${prefix}${page}` || '/'
    const res = await get(path)
    assert(`${locale} ${path} -> 200`, res.status === 200, `status=${res.status}`)
  }
}

console.log('\n== 筛选面板按语言渲染（/cards 专属）==')
for (const locale of ['zh', 'ja', 'en']) {
  const prefix = locale === 'zh' ? '' : `/${locale}`
  const res = await get(`${prefix}/cards`)
  assert(
    `${locale} 筛选面板: 「${FILTER_MARKERS[locale]}」`,
    res.body.includes(FILTER_MARKERS[locale]),
  )
  for (const [other, marker] of Object.entries(FILTER_MARKERS)) {
    if (other === locale) continue
    assert(`${locale} 筛选面板不含 ${other} 的「${marker}」`, !res.body.includes(marker))
  }
}

console.log('\n== 未知语言段必须 404（不能被当成语言渲染）==')
for (const path of ['/foo', '/foo/cards', '/de/cards']) {
  const res = await get(path)
  assert(`${path} -> 404`, res.status === 404, `status=${res.status}`)
  assert(
    `${path}: 不误报为已支持语言`,
    !res.body.includes('新着カード') && !res.body.includes('Recently added'),
  )
}

console.log('\n== 语言切换链接与 hreflang ==')
const jaCards = await get('/ja/cards')
// React 以 camelCase 输出 hrefLang，HTML 解析时大小写不敏感，故按小写比较。
const jaCardsLower = jaCards.body.toLowerCase()
for (const hrefLang of ['zh-CN', 'ja-JP', 'en', 'x-default']) {
  assert(
    `/ja/cards 含 hreflang=${hrefLang}`,
    jaCardsLower.includes(`hreflang="${hrefLang.toLowerCase()}"`),
  )
}
assert(
  '/ja/cards 的 en 等价位址是 /en/cards',
  jaCards.body.includes('href="/en/cards"'),
  jaCards.body.match(/<link[^>]*hreflang="en"[^>]*>/)?.[0],
)
assert(
  '/ja/cards 的默认语言等价位址是 /cards',
  jaCards.body.includes('href="/cards"'),
)

console.log('\n== 后台内容里的站内链接必须补上语言段 ==')
// banner.link 来自 Directus（种子值 `/cards?ip=1`），绕过路由类型系统，
// 曾经在 /ja 页渲染成 /cards?ip=1，点进去掉回默认语言。
for (const [locale, prefix] of [['zh', ''], ['ja', '/ja'], ['en', '/en']]) {
  const res = await get(prefix || '/')
  const expected = `${prefix}/cards?ip=1`
  assert(
    `${locale}: banner 链接为 ${expected}`,
    res.body.includes(`href="${expected}"`),
    (res.body.match(/href="[^"]*ip=1"/) ?? ['未找到'])[0],
  )
}

console.log('\n== 内容数据不应被翻译（Directus 内容原样输出）==')
const zhDetail = await get('/cards/1')
assert(
  '卡牌详情仍渲染 Directus 的卡名',
  /<h1[^>]*>[^<]+<\/h1>/.test(zhDetail.body),
  '未找到 h1',
)

console.log(`\n${failed === 0 ? '全部通过 ✓' : `${failed} 项失败 ✗`}`)
process.exit(failed === 0 ? 0 : 1)
