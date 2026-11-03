// Pins the observable outputs of src/lib/directus.ts against a fixed Directus stub.
// Capture with --capture, then rerun without it after a client rewrite.
import { createServer } from 'node:http'
import { build } from 'esbuild'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ENTRY = join(ROOT, 'src/lib/directus.ts')
const TMP = join(ROOT, '.verify')
const BUNDLE = join(TMP, 'directus.bundle.mjs')
const BASELINE = join(ROOT, 'scripts/directus-client.baseline.json')
const CAPTURE = process.argv.includes('--capture')

const cards = [
  {
    id: 1,
    name: '皮卡丘',
    code: 'PK-001',
    price: 120,
    status: 'published',
    card_status: 'raw',
    is_high_value: false,
    date_created: '2026-10-01T00:00:00.000Z',
    ip_id: { name: '宝可梦' },
    series_id: { name: '基础系列' },
    sub_series_id: { name: '第一弹' },
    rarity_id: { name: 'HR' },
    images: [
      { directus_files_id: 'file-a' },
      { directus_files_id: { id: 'file-b' } },
      null,
      'file-c',
      { directus_files_id: null },
    ],
  },
  {
    id: 2,
    name: '喷火龙',
    code: 'PK-002',
    price: 880,
    status: 'published',
    card_status: 'packaged',
    is_high_value: true,
    date_created: '2026-10-02T00:00:00.000Z',
    ip_id: { name: '宝可梦' },
    series_id: null,
    sub_series_id: null,
    rarity_id: { name: 'SR' },
    images: [],
  },
]

const fixtures = {
  ips: [{ id: 1, name: '宝可梦', sort: 1 }],
  series: [{ id: 2, name: '基础系列', ip_id: 1, sort: 1 }],
  sub_series: [{ id: 3, name: '第一弹', series_id: 2, sort: 1 }],
  rarities: [
    { id: 3, name: 'HR', sort: 1 },
    { id: 4, name: 'SR', sort: 2 },
  ],
  banners: [
    {
      id: 1,
      title: '回购中',
      description: '高价回收',
      image: 'file-banner',
      link: 'https://example.com',
      sort: 1,
      status: 'published',
    },
  ],
  announcements: [
    {
      id: 1,
      title: '开站公告',
      body: '欢迎',
      published_at: '2026-10-01T00:00:00.000Z',
      is_pinned: true,
    },
  ],
  info_pages: [
    { id: 1, page_key: 'terms', title: '利用规则', body: '规则正文', sort: 1 },
    { id: 2, page_key: 'data-usage', title: '数据使用', body: '数据正文', sort: 2 },
  ],
  shops: [
    {
      id: 1,
      name: '东京店',
      image: 'file-shop',
      lat: 35.68,
      lng: 139.76,
      sort: 1,
      status: 'published',
    },
  ],
  site_settings: {
    id: 1,
    site_name: '卡牌市场',
    logo: 'file-logo',
    x_account: '@cardmarket',
  },
}

function json(res, payload, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

async function startStub(variant) {
  const seen = []
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const path = url.pathname
    let raw = ''
    for await (const chunk of req) raw += chunk
    seen.push(`${req.method} ${path}${url.search}`)

    if (path === '/items/cards' && req.method === 'GET') {
      if (url.searchParams.has('aggregate')) return json(res, { data: [{ count: '6' }] })
      return json(res, { data: cards, meta: { filter_count: 6, total_count: 6 } })
    }
    const cardMatch = path.match(/^\/items\/cards\/(.+)$/)
    if (cardMatch && req.method === 'GET') {
      if (cardMatch[1] === 'missing') return json(res, { errors: [{ message: 'not found' }] }, 404)
      return json(res, { data: cards[0] })
    }
    if (path === '/items/ips') return json(res, { data: fixtures.ips })
    if (path === '/items/series') return json(res, { data: fixtures.series })
    if (path === '/items/sub_series') return json(res, { data: fixtures.sub_series })
    if (path === '/items/rarities') {
      if (url.searchParams.get('fields') === 'id') {
        return json(res, { data: [{ id: 3 }, { id: 4 }] })
      }
      return json(res, { data: fixtures.rarities })
    }
    if (path === '/items/banners') return json(res, { data: fixtures.banners })
    if (path === '/items/announcements') return json(res, { data: fixtures.announcements })
    const announcementMatch = path.match(/^\/items\/announcements\/(.+)$/)
    if (announcementMatch) {
      if (announcementMatch[1] === 'missing') {
        return json(res, { errors: [{ message: 'not found' }] }, 404)
      }
      return json(res, { data: fixtures.announcements[0] })
    }
    if (path === '/items/site_settings') {
      const data = variant === 'array' ? [fixtures.site_settings] : fixtures.site_settings
      return json(res, { data })
    }
    if (path === '/items/info_pages') {
      const filter = url.searchParams.get('filter')
      let key = null
      try {
        key = filter ? JSON.parse(filter).page_key?._eq : JSON.parse(url.searchParams.get('filter[page_key][_eq]') || 'null')
      } catch {
        key = null
      }
      const data = key === 'unknown' ? [] : key ? fixtures.info_pages.filter((p) => p.page_key === key) : fixtures.info_pages
      return json(res, { data })
    }
    if (path === '/items/shops') return json(res, { data: fixtures.shops })
    if (path === '/items/messages' && req.method === 'POST') {
      let body = {}
      try {
        body = JSON.parse(raw)
      } catch {
        body = {}
      }
      if (body.content === '__fail__') {
        return json(res, { errors: [{ message: 'Forbidden' }] }, 403)
      }
      return json(res, { data: { id: 99, ...body } })
    }
    return json(res, { errors: [{ message: `no stub route for ${path}` }] }, 404)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  return {
    base,
    seen,
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

async function bundleClient(base) {
  await build({
    entryPoints: [ENTRY],
    outfile: BUNDLE,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    define: { 'import.meta.env.VITE_DIRECTUS_URL': JSON.stringify(base) },
    logLevel: 'silent',
  })
  return import(`${pathToFileURL(BUNDLE).href}?t=${Date.now()}`)
}

const messageResult = (r) => ({ ok: r.ok, hasError: Boolean(r.error) })

async function collect(mod) {
  return {
    DIRECTUS_BASE: mod.DIRECTUS_BASE,
    assetUrl: [
      mod.assetUrl('file-a'),
      mod.assetUrl('file-a', { width: 600, format: 'webp' }),
      mod.assetUrl('file-a', { width: 1200, height: 630, format: 'jpg', fit: 'cover' }),
      mod.assetUrl(null),
    ],
    getCards_default: await mod.getCards({}),
    getCards_full: await mod.getCards({
      q: 'HR',
      ipIds: [1],
      seriesIds: [2],
      subSeriesIds: [3],
      rarityIds: [4],
      cardStatus: ['raw'],
      highValueOnly: true,
      minPrice: 10,
      maxPrice: 999,
      sort: 'price_asc',
      page: 2,
      limit: 2,
    }),
    getCards_newest: await mod.getCards({ sort: 'newest' }),
    getCard_1: await mod.getCard(1),
    getCard_missing: await mod.getCard('missing'),
    getIps: await mod.getIps(),
    getSeries: await mod.getSeries(),
    getSubSeries: await mod.getSubSeries(),
    getRarities: await mod.getRarities(),
    getBanners: await mod.getBanners(),
    getAnnouncements: await mod.getAnnouncements(),
    getAnnouncement_1: await mod.getAnnouncement(1),
    getAnnouncement_missing: await mod.getAnnouncement('missing'),
    getSiteSettings: await mod.getSiteSettings(),
    getInfoPages: await mod.getInfoPages(),
    getInfoPage_terms: await mod.getInfoPage('terms'),
    getInfoPage_unknown: await mod.getInfoPage('unknown'),
    getShops: await mod.getShops(),
    postMessage_ok: messageResult(
      await mod.postMessage({ content: 'hello', contact_name: 'A', contact_info: 'B', card: 1 }),
    ),
    postMessage_fail: messageResult(await mod.postMessage({ content: '__fail__' })),
  }
}

function normalizeBase(value, base) {
  if (typeof value === 'string') return value.split(base).join('<BASE>')
  if (Array.isArray(value)) return value.map((v) => normalizeBase(v, base))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeBase(v, base)]),
    )
  }
  return value
}

async function runVariant(variant) {
  const stub = await startStub(variant)
  try {
    const mod = await bundleClient(stub.base)
    const result = await collect(mod)
    return { output: normalizeBase(result, stub.base), seen: stub.seen }
  } finally {
    await stub.close()
  }
}

async function main() {
  await mkdir(TMP, { recursive: true })
  const results = {}
  for (const variant of ['object', 'array']) {
    const r = await runVariant(variant)
    results[variant] = r.output
    await writeFile(join(TMP, `requests.${variant}.log`), r.seen.join('\n') + '\n')
  }
  const current = JSON.stringify(results, null, 2) + '\n'
  if (CAPTURE) {
    await writeFile(BASELINE, current)
    console.log(`baseline captured: ${BASELINE}`)
    return
  }
  let baseline
  try {
    baseline = await readFile(BASELINE, 'utf8')
  } catch {
    console.error('missing baseline, run with --capture first')
    process.exitCode = 1
    return
  }
  if (baseline === current) {
    console.log('equivalence: PASS (all exported outputs match the pinned baseline)')
    return
  }
  console.error('equivalence: FAIL')
  const a = baseline.split('\n')
  const b = current.split('\n')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) console.error(`line ${i + 1}\n  baseline: ${a[i] ?? '<none>'}\n  current:  ${b[i] ?? '<none>'}`)
  }
  process.exitCode = 1
}

await main().finally(() => rm(TMP, { recursive: true, force: true }))
