// 种子数据脚本（演示用，建议仅运行一次）
// 创建样例维度、卡牌、公告、banner、站点设置、一条留言，并上传占位图。
// 用法：docker compose up -d 且 bootstrap 完成后，运行 npm run directus:seed
import { Buffer } from 'node:buffer'

const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345'

let TOKEN = ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function login() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      })
      if (res.ok) {
        TOKEN = (await res.json()).data.access_token
        return
      }
    } catch {}
    await sleep(2000)
  }
  throw new Error('登录失败')
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text().catch(() => '')}`)
  return res.status === 204 ? null : res.json()
}

const post = (col, body) => api('POST', `/items/${col}`, body).then((r) => r.data)
const patch = (col, body) => api('PATCH', `/items/${col}`, body).then((r) => r.data)
const getOne = (col) => api('GET', `/items/${col}?limit=1`).then((r) => r.data?.[0] || null)

const PLACEHOLDER_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function uploadPlaceholder(name) {
  const buf = Buffer.from(PLACEHOLDER_PNG, 'base64')
  const fd = new FormData()
  fd.append('title', name)
  fd.append('file', new Blob([buf], { type: 'image/png' }), `${name}.png`)
  const res = await fetch(`${BASE}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fd,
  })
  if (!res.ok) throw new Error(`上传占位图失败 ${res.status}`)
  return (await res.json()).data.id
}

async function seedShops() {
  if (await getOne('shops')) {
    console.log('· 店铺已存在，跳过 shops 种子。')
    return
  }
  const shops = [
    {
      name: 'card-market · 秋叶原本店',
      address: '东京都千代田区外神田 1-1 示例大楼 3F',
      lat: 35.6995,
      lng: 139.7717,
      phone: '03-1234-5678',
      business_hours: '11:00–20:00（周一休）',
      description: '宝可梦 / 游戏王 / 龙珠等全品类高价回购，鉴定速度快，支持现场结算。',
      sort: 1,
      status: 'published',
    },
    {
      name: 'card-market · 涩谷店',
      address: '东京都涩谷区涩谷 2-2 示例大厦 1F',
      lat: 35.6595,
      lng: 139.7004,
      phone: '03-2345-6789',
      business_hours: '12:00–21:00（不定休）',
      description: '主打高罕卡专项回收，UR/SSR 估价优厚，欢迎线下交流。',
      sort: 2,
      status: 'draft',
    },
  ]
  for (const s of shops) await post('shops', s)
  console.log(`+ 店铺种子：${shops.length} 家`)
}

// 审核用信息页（运营信息 / 个人信息收集 / 利用规则 / 数据使用）。
// 可独立补种：即便其他数据已存在也执行一次；已存在同 page_key 的条目则跳过。
async function seedInfoPages() {
  const existing = await api(
    'GET',
    '/items/info_pages?limit=100&fields=page_key',
  ).then((r) => new Set((r.data || []).map((p) => p.page_key)))
  const pages = [
    {
      page_key: 'operation',
      title: '运营信息',
      sort: 1,
      body: [
        '<h2>运营主体</h2>',
        '<p>本网站由 card-market 运营，提供卡牌展示、回购咨询与门店信息服务。</p>',
        '<h2>联系方式</h2>',
        '<p>客服邮箱：shop@example.com。营业日通常在 1 个工作日内回复。</p>',
        '<h2>免责声明</h2>',
        '<p>网站展示的卡牌信息、价格与库存仅供参考，实际以门店鉴定与确认为准。</p>',
      ].join(''),
    },
    {
      page_key: 'personal-info',
      title: '个人信息收集',
      sort: 2,
      body: [
        '<h2>收集范围</h2>',
        '<p>留言表单会收集您主动填写的留言内容、联系人姓名与联系方式（邮箱 / 电话 / 微信）。联系人为选填项。</p>',
        '<h2>收集目的</h2>',
        '<p>仅用于回复您的咨询、处理回购请求与改进服务，不用于任何营销推送。</p>',
        '<h2>保存与删除</h2>',
        '<p>留言在后台保存至处理完毕。如需删除您的个人信息，请通过客服邮箱联系我们。</p>',
      ].join(''),
    },
    {
      page_key: 'terms',
      title: '利用规则',
      sort: 3,
      body: [
        '<h2>网站使用</h2>',
        '<p>访问本网站即表示您同意遵守本规则。请勿以爬虫、批量抓取等方式对本站造成负担。</p>',
        '<h2>内容权利</h2>',
        '<p>本站的文案、图片与排版归运营方或相应权利人所有，未经许可不得转载用于商业用途。</p>',
        '<h2>禁止行为</h2>',
        '<p>禁止提交违法、侵权、辱骂或垃圾信息。违反者我们有权删除内容并限制访问。</p>',
        '<h2>规则变更</h2>',
        '<p>本规则可能随服务调整而更新，更新后在本页公布即生效。</p>',
      ].join(''),
    },
    {
      page_key: 'data-usage',
      title: '数据使用',
      sort: 4,
      body: [
        '<h2>数据用途</h2>',
        '<p>本站收集的留言数据仅用于咨询回复与回购业务处理，不对外出售或共享给第三方。</p>',
        '<h2>Cookie 与本地存储</h2>',
        '<p>本站仅使用浏览器本地存储保存界面语言与深色模式偏好，不做跨站跟踪，也未接入第三方广告统计。</p>',
        '<h2>数据安全</h2>',
        '<p>数据存放于受控的内容管理系统，仅授权管理员可访问；我们会采取合理措施防止未授权访问与泄露。</p>',
      ].join(''),
    },
  ]
  let created = 0
  for (const p of pages) {
    if (existing.has(p.page_key)) continue
    await post('info_pages', { ...p, status: 'published' })
    created++
  }
  console.log(
    created
      ? `+ 信息页种子：${created} 页（运营信息 / 个人信息收集 / 利用规则 / 数据使用）`
      : '· 信息页已存在，跳过 info_pages 种子。',
  )
}

async function main() {
  await login()
  // 店铺 / 信息页可独立补种（即便其他数据已存在也执行一次）
  await seedShops()
  await seedInfoPages()
  if (await getOne('ips')) {
    console.log('⚠ 已存在数据（ips 非空），跳过其余 seed。如需重置请清空相关集合。')
    return
  }

  const imgId = await uploadPlaceholder('placeholder')

  // 维度
  const pokemon = await post('ips', { name: '宝可梦', sort: 1, status: true })
  const yugioh = await post('ips', { name: '游戏王', sort: 2, status: true })

  const scarlet = await post('series', { name: '朱紫', ip_id: pokemon.id, sort: 1, status: true })
  const sword = await post('series', { name: '剑盾', ip_id: pokemon.id, sort: 2, status: true })
  const mainYg = await post('series', { name: '主力系列', ip_id: yugioh.id, sort: 1, status: true })

  const scarletA = await post('sub_series', { name: '朱紫A', series_id: scarlet.id, sort: 1, status: true })
  const swordA = await post('sub_series', { name: '剑盾A', series_id: sword.id, sort: 1, status: true })
  const ygA = await post('sub_series', { name: '游戏王A', series_id: mainYg.id, sort: 1, status: true })

  const ssr = await post('rarities', { name: 'SSR', sort: 1, status: true })
  const ur = await post('rarities', { name: 'UR', sort: 2, status: true })
  const hr = await post('rarities', { name: 'HR', sort: 3, status: true })
  const n = await post('rarities', { name: 'N', sort: 4, status: true })

  // 卡牌
  const cardDefs = [
    { name: '皮卡丘', ip: pokemon, s: scarlet, sub: scarletA, r: hr, code: '197/197', price: 120, hv: true },
    { name: '喷火龙', ip: pokemon, s: scarlet, sub: scarletA, r: ur, code: '199/197', price: 880, hv: true },
    { name: '妙蛙种子', ip: pokemon, s: sword, sub: swordA, r: n, code: '001/098', price: 35 },
    { name: '黑魔导', ip: yugioh, s: mainYg, sub: ygA, r: ur, code: 'EN001', price: 240, hv: true },
    { name: '青眼白龙', ip: yugioh, s: mainYg, sub: ygA, r: ssr, code: 'EN002', price: 560 },
  ]
  const cards = []
  for (const [index, c] of cardDefs.entries()) {
    const card = await post('cards', {
      name: c.name,
      ip_id: c.ip.id,
      series_id: c.s.id,
      sub_series_id: c.sub.id,
      code: c.code,
      rarity_id: c.r.id,
      price: c.price,
      is_high_value: !!c.hv,
      card_status: 'raw',
      status: 'published',
      description: `${c.name}（${c.ip.name}）示例卡牌，状态裸卡，支持回购咨询。`,
    })
    // 商品图片是 M2M（cards_images → directus_files），前两张卡带示例图
    if (index < 2) {
      await post('cards_images', {
        cards_id: card.id,
        directus_files_id: imgId,
        sort: 0,
      })
    }
    cards.push(card)
  }

  // banner
  await post('banners', {
    title: '新到宝可梦 151 全图鉴',
    description: '限时回购高价回收，欢迎咨询',
    image: imgId,
    link: '/cards?ip=1',
    sort: 1,
    status: 'published',
  })

  // 公告
  await post('announcements', {
    title: '店铺春节营业时间调整',
    body: '<p>春节期间营业时间调整为 10:00–18:00，敬请留意。</p>',
    published_at: null,
    is_pinned: true,
    sort: 1,
    status: 'published',
  })
  await post('announcements', {
    title: '游戏王高罕卡专项回收启动',
    body: '<p>即日起开放游戏王 UR/SSR 高价回收，欢迎留言估价。</p>',
    published_at: null,
    is_pinned: false,
    sort: 2,
    status: 'published',
  })
  // 定时发布（未来）
  const future = new Date(Date.now() + 7 * 864e5).toISOString()
  await post('announcements', {
    title: '（预告）线下卡牌交流会展位预告',
    body: '<p>将于下月参与线下展会，详情稍后公布。</p>',
    published_at: future,
    is_pinned: false,
    sort: 3,
    status: 'published',
  })

  // 站点设置（单例，用 PATCH upsert）
  await patch('site_settings', {
    site_name: 'card-market',
    intro: '专注宝可梦 / 游戏王 / 龙珠等卡牌展示与高价回购。',
    x_account: '@cardmarket',
    contact_email: 'shop@example.com',
    data_notice: '本站展示数据仅供鉴赏，交易以实际鉴定为准。',
    privacy_policy: '<p>我们仅将联系方式用于回复您的咨询。</p>',
  })

  // 一条留言（模拟访客提交）
  await post('messages', {
    content: '想咨询青眼白龙的回收价格，谢谢！',
    contact_name: '田中',
    contact_info: 'tanaka@example.com',
    status: 'new',
  })

  console.log(`✅ 种子数据完成：${cards.length} 张卡牌、banner、公告与站点设置已写入。`)
}

main().catch((e) => {
  console.error('❌ seed 失败：', e.message)
  process.exit(1)
})
