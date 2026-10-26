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
      name: '卡牌回购站 · 秋叶原本店',
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
      name: '卡牌回购站 · 涩谷店',
      address: '东京都涩谷区涩谷 2-2 示例大厦 1F',
      lat: 35.6595,
      lng: 139.7004,
      phone: '03-2345-6789',
      business_hours: '12:00–21:00（不定休）',
      description: '主打高罕卡专项回收，UR/SSR 估价优厚，欢迎线下交流。',
      sort: 2,
      status: 'published',
    },
    {
      name: '卡牌回购站 · 池袋店',
      address: '东京都丰岛区西池袋 1-3 示例大楼 B1',
      lat: 35.7295,
      lng: 139.7109,
      phone: '03-3456-7890',
      business_hours: '11:00–19:00（周二休）',
      description: '面向新手玩家的友好门店，裸卡与包装卡均可回收。',
      sort: 3,
      status: 'published',
    },
  ]
  for (const s of shops) await post('shops', s)
  console.log(`+ 店铺种子：${shops.length} 家`)
}

async function main() {
  await login()
  // 店铺可独立补种（即便其他数据已存在也执行一次）
  await seedShops()
  if (await getOne('ips')) {
    console.log('⚠ 已存在数据（ips 非空），跳过其余 seed。如需重置请清空相关集合。')
    return
  }

  const imgId = await uploadPlaceholder('placeholder')

  // 维度
  const pokemon = await post('ips', { name: '宝可梦', sort: 1, status: true })
  const yugioh = await post('ips', { name: '游戏王', sort: 2, status: true })
  const db = await post('ips', { name: '龙珠', sort: 3, status: true })

  const scarlet = await post('series', { name: '朱紫', ip_id: pokemon.id, sort: 1, status: true })
  const sword = await post('series', { name: '剑盾', ip_id: pokemon.id, sort: 2, status: true })
  const mainYg = await post('series', { name: '主力系列', ip_id: yugioh.id, sort: 1, status: true })
  const dbMain = await post('series', { name: '主线', ip_id: db.id, sort: 1, status: true })

  const scarletA = await post('sub_series', { name: '朱紫A', series_id: scarlet.id, sort: 1, status: true })
  const swordA = await post('sub_series', { name: '剑盾A', series_id: sword.id, sort: 1, status: true })
  const ygA = await post('sub_series', { name: '游戏王A', series_id: mainYg.id, sort: 1, status: true })
  // 龙珠仅两层，仍需空壳子系列占位以满足必填
  const dbA = await post('sub_series', { name: '主线A', series_id: dbMain.id, sort: 1, status: true })

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
    { name: '孙悟空', ip: db, s: dbMain, sub: dbA, r: hr, code: 'DB-01', price: 90 },
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
    site_name: '卡牌回购站',
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
