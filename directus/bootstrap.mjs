// Directus 数据模型落地脚本（幂等，可重复运行）
// 创建集合/字段/关系(M2O+M2M)/索引/Public 权限，对应 docs/development.md §4。
// 用法：
//   1) 启动栈：docker compose up -d
//   2) 等待 Directus 就绪（首次启动会做数据库迁移）
//   3) 运行：npm run directus:bootstrap
// 环境变量读取 .env（DIRECTUS_URL / ADMIN_EMAIL / ADMIN_PASSWORD / DB_*）。
import { Pool } from 'pg'

const BASE = process.env.DIRECTUS_URL || 'http://localhost:8055'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345'

// 直连 Postgres（宿主机经 compose 映射的 5432）
const DB = {
  host: process.env.DIRECTUS_DB_HOST || 'localhost',
  port: Number(process.env.DIRECTUS_DB_PORT || 5432),
  database: process.env.DIRECTUS_DB_NAME || 'directus',
  user: process.env.DIRECTUS_DB_USER || 'directus',
  password: process.env.DIRECTUS_DB_PASSWORD || 'directus',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let TOKEN = ''
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${method} ${path} -> ${res.status} ${text}`)
  }
  return res.status === 204 ? null : res.json()
}

async function login() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      })
      if (res.ok) {
        const { data } = await res.json()
        TOKEN = data.access_token
        console.log('✓ 已登录 Directus')
        return
      }
    } catch {
      /* retry */
    }
    process.stdout.write('.')
    await sleep(2000)
  }
  throw new Error('无法登录 Directus，请确认服务已启动且账号正确')
}

// ── 存在性检查（幂等）──
async function collectionExists(name) {
  try {
    await api('GET', `/collections/${name}`)
    return true
  } catch {
    return false
  }
}
async function fieldExists(collection, field) {
  try {
    await api('GET', `/fields/${collection}/${field}`)
    return true
  } catch {
    return false
  }
}

// ── 集合声明 ──
// 字段声明：{ field, type, interface, required?, default?, nullable?, options?, special?, note?, decimal? }
const CHOICES = (map) =>
  Object.entries(map).map(([value, text]) => ({ value, text }))

// M2O 下拉：后台直接选已有记录（而非手输 ID）
// select-dropdown-m2o 才是 Directus 的「多对一下拉」编辑接口；
// 'relational' 只是展示方式，误用会让字段退化成纯文本输入。
const M2O_OPTIONS = { template: '{{name}}', enableSelect: true, enableCreate: false }

// ── 界面多语言（meta.translations）──
// 界面语言由用户个人设置决定（头像 → Settings → Language，Directus 内置 zh-CN / ja-JP 等）；
// 这里定义「切到对应语言时，集合与字段显示什么名字」。
// 中文标签写在集合声明里（label），日文标签集中在此表，便于审校与补录。
const COLLECTION_LABELS_JA = {
  ips: 'IP / 大分類',
  series: 'シリーズ',
  sub_series: 'サブシリーズ',
  rarities: 'レアリティ',
  cards: 'カード',
  banners: 'バナー',
  announcements: 'お知らせ',
  messages: 'お問い合わせ',
  site_settings: 'サイト設定',
  shops: '店舗',
  info_pages: 'サイト情報',
}

const FIELD_LABELS_JA = {
  ips: { name: '名称', sort: '並び順', status: '有効' },
  series: { name: 'シリーズ名', ip_id: '所属 IP', sort: '並び順', status: '有効' },
  sub_series: {
    name: 'サブシリーズ名',
    series_id: '所属シリーズ',
    sort: '並び順',
    status: '有効',
  },
  rarities: { name: 'レアリティ名', sort: '並び順', status: '有効' },
  cards: {
    name: 'カード名',
    ip_id: 'IP / 大分類',
    series_id: 'シリーズ',
    sub_series_id: 'サブシリーズ',
    code: 'コレクション番号',
    rarity_id: 'レアリティ',
    price: '販売価格',
    description: '説明',
    is_high_value: '高価買取',
    card_status: 'カード状態',
    status: '公開ステータス',
    images: '商品画像',
    date_created: '作成日時',
    date_updated: '更新日時',
    user_created: '作成者',
  },
  banners: {
    title: 'タイトル',
    description: '説明',
    image: 'バナー画像',
    link: 'リンク先',
    sort: '並び順',
    status: '公開ステータス',
  },
  announcements: {
    title: 'タイトル',
    body: '本文',
    published_at: '公開日時',
    is_pinned: 'ピン留め',
    sort: '並び順',
    status: '公開ステータス',
  },
  messages: {
    content: 'お問い合わせ内容',
    contact_name: 'お名前',
    contact_info: '連絡先',
    status: '対応ステータス',
  },
  site_settings: {
    site_name: 'サイト名',
    logo: 'サイトロゴ',
    intro: 'サイト紹介',
    x_account: 'X アカウント',
    contact_email: 'メールアドレス',
    data_notice: 'データについて',
    privacy_policy: 'プライバシーポリシー',
  },
  shops: {
    name: '店舗名',
    address: '住所',
    geo: '位置情報',
    lat: '緯度',
    lng: '経度',
    phone: '電話番号',
    business_hours: '営業時間',
    description: '店舗紹介',
    image: '店舗画像',
    sort: '並び順',
    status: '公開ステータス',
  },
  info_pages: {
    page_key: 'ページ識別子',
    title: 'タイトル',
    body: '本文',
    sort: '並び順',
    status: '公開ステータス',
  },
}

// 支持的语言：zh-CN / ja-JP（新增语言时扩展 buildTranslations 与两张标签表）

function buildTranslations({ zh, ja }) {
  const list = []
  if (zh) list.push({ language: 'zh-CN', translation: zh })
  if (ja) list.push({ language: 'ja-JP', translation: ja })
  return list.length ? list : null
}

const collections = [
  {
    name: 'ips',
    label: 'IP / 大类',
    icon: 'bookmark',
    note: 'IP / 大类（顶层维度）',
    sortField: 'sort',
    displayTemplate: '{{name}}',
    fields: [
      { field: 'name', label: '名称', type: 'string', interface: 'input', required: true },
      { field: 'sort', label: '排序', type: 'integer', interface: 'sort', default: 0 },
      {
        field: 'status',
        label: '启用',
        type: 'boolean',
        interface: 'boolean',
        default: true,
        note: '是否启用',
      },
    ],
  },
  {
    name: 'series',
    label: '系列',
    icon: 'layers',
    note: '系列（IP 子级）',
    sortField: 'sort',
    displayTemplate: '{{name}}',
    fields: [
      { field: 'name', label: '系列名称', type: 'string', interface: 'input', required: true },
      {
        field: 'ip_id',
        label: '所属 IP',
        type: 'integer',
        interface: 'select-dropdown-m2o',
        required: true,
        related: 'ips',
        options: M2O_OPTIONS,
      },
      { field: 'sort', label: '排序', type: 'integer', interface: 'sort', default: 0 },
      { field: 'status', label: '启用', type: 'boolean', interface: 'boolean', default: true },
    ],
  },
  {
    name: 'sub_series',
    label: '子系列',
    icon: 'tag',
    note: '子系列（系列子级，必填）',
    sortField: 'sort',
    displayTemplate: '{{name}}',
    fields: [
      { field: 'name', label: '子系列名称', type: 'string', interface: 'input', required: true },
      {
        field: 'series_id',
        label: '所属系列',
        type: 'integer',
        interface: 'select-dropdown-m2o',
        required: true,
        related: 'series',
        options: M2O_OPTIONS,
      },
      { field: 'sort', label: '排序', type: 'integer', interface: 'sort', default: 0 },
      { field: 'status', label: '启用', type: 'boolean', interface: 'boolean', default: true },
    ],
  },
  {
    name: 'rarities',
    label: '稀有度',
    icon: 'star',
    note: '稀有程度维度',
    sortField: 'sort',
    displayTemplate: '{{name}}',
    fields: [
      { field: 'name', label: '稀有度名称', type: 'string', interface: 'input', required: true },
      { field: 'sort', label: '排序', type: 'integer', interface: 'sort', default: 0 },
      { field: 'status', label: '启用', type: 'boolean', interface: 'boolean', default: true },
    ],
  },
  {
    name: 'cards',
    label: '卡牌',
    icon: 'cards',
    note: '卡牌信息',
    displayTemplate: '{{name}}',
    fields: [
      { field: 'name', label: '卡牌名称', type: 'string', interface: 'input', required: true },
      { field: 'ip_id', label: 'IP / 大类', type: 'integer', interface: 'select-dropdown-m2o', required: true, related: 'ips', options: M2O_OPTIONS },
      { field: 'series_id', label: '系列', type: 'integer', interface: 'select-dropdown-m2o', required: true, related: 'series', options: M2O_OPTIONS },
      { field: 'sub_series_id', label: '子系列', type: 'integer', interface: 'select-dropdown-m2o', required: true, related: 'sub_series', options: M2O_OPTIONS },
      { field: 'code', label: '收藏编号', type: 'string', interface: 'input', note: '收藏编号，如 123/197' },
      { field: 'rarity_id', label: '稀有度', type: 'integer', interface: 'select-dropdown-m2o', required: true, related: 'rarities', options: M2O_OPTIONS },
      { field: 'price', label: '售价', type: 'decimal', interface: 'input', decimal: { precision: 10, scale: 2 }, note: '卖价' },
      { field: 'description', label: '描述', type: 'text', interface: 'textarea' },
      {
        field: 'is_high_value',
        label: '高价买取',
        type: 'boolean',
        interface: 'boolean',
        default: false,
        note: '勾选后进入首页「高价买取」栏，并可用列表页「只看高价买取」筛选',
      },
      {
        field: 'card_status',
        label: '卡品状态',
        type: 'string',
        interface: 'select-dropdown',
        required: true,
        default: 'raw',
        options: { choices: CHOICES({ raw: '裸卡', packaged: '有包装' }) },
      },
      {
        field: 'status',
        label: '发布状态',
        type: 'string',
        interface: 'select-dropdown',
        default: 'draft',
        options: {
          choices: CHOICES({ draft: '草稿', published: '已发布', archived: '已归档' }),
        },
        note: 'Directus 内置状态',
      },
      {
        field: 'date_created',
        label: '创建时间',
        type: 'timestamp',
        interface: 'datetime',
        readonly: true,
        special: ['date_created'],
        note: '创建时间（系统自动维护）',
      },
      {
        field: 'date_updated',
        label: '更新时间',
        type: 'timestamp',
        interface: 'datetime',
        readonly: true,
        special: ['date_updated'],
        note: '更新时间（系统自动维护）',
      },
      {
        field: 'user_created',
        label: '创建人',
        type: 'uuid',
        interface: 'user',
        related: 'directus_users',
        special: ['user_created'],
        note: '创建人（系统自动维护，关联 directus_users 的 UUID 主键）',
      },
    ],
  },
  {
    name: 'banners',
    label: '轮播图',
    icon: 'image',
    note: '首页轮播广告（单槽位）',
    sortField: 'sort',
    displayTemplate: '{{title}}',
    fields: [
      { field: 'title', label: '标题', type: 'string', interface: 'input' },
      { field: 'description', label: '描述', type: 'text', interface: 'textarea' },
      { field: 'image', label: '轮播图', type: 'uuid', interface: 'file', required: true, related: 'directus_files', note: '轮播图（必填）' },
      { field: 'link', label: '跳转链接', type: 'string', interface: 'input', note: '跳转链接（内部路由或外链）' },
      { field: 'sort', label: '排序', type: 'integer', interface: 'sort', default: 0 },
      {
        field: 'status',
        label: '发布状态',
        type: 'string',
        interface: 'select-dropdown',
        default: 'draft',
        options: { choices: CHOICES({ draft: '草稿', published: '已发布', archived: '已归档' }) },
      },
    ],
  },
  {
    name: 'announcements',
    label: '公告',
    icon: 'campaign',
    note: '公告',
    sortField: 'sort',
    displayTemplate: '{{title}}',
    fields: [
      { field: 'title', label: '标题', type: 'string', interface: 'input', required: true },
      { field: 'body', label: '正文', type: 'text', interface: 'input-rich-text-md', note: '正文（富文本）' },
      { field: 'published_at', label: '发布时间', type: 'timestamp', interface: 'datetime', note: '发布时间；未来=定时发布，null=立即' },
      { field: 'is_pinned', label: '置顶', type: 'boolean', interface: 'boolean', default: false, note: '置顶' },
      { field: 'sort', label: '排序', type: 'integer', interface: 'sort', default: 0 },
      {
        field: 'status',
        label: '发布状态',
        type: 'string',
        interface: 'select-dropdown',
        default: 'draft',
        options: { choices: CHOICES({ draft: '草稿', published: '已发布', archived: '已归档' }) },
      },
    ],
  },
  {
    name: 'messages',
    label: '留言',
    icon: 'forum',
    note: '访客留言（工单式，非 Directus 状态）',
    displayTemplate: '{{content}}',
    fields: [
      { field: 'content', label: '留言内容', type: 'text', interface: 'textarea', required: true },
      { field: 'contact_name', label: '联系人', type: 'string', interface: 'input', note: '联系人（选填）' },
      { field: 'contact_info', label: '联系方式', type: 'string', interface: 'input', note: '联系方式（选填）' },
      {
        field: 'status',
        label: '处理状态',
        type: 'string',
        interface: 'select-dropdown',
        default: 'new',
        options: {
          choices: CHOICES({
            new: '新',
            processed: '已处理',
            archived: '已归档',
            spam: '已标记垃圾',
          }),
        },
      },
    ],
  },
  {
    name: 'shops',
    label: '店铺',
    icon: 'store',
    note: '店铺信息（可多个，含定位坐标）',
    sortField: 'sort',
    displayTemplate: '{{name}}',
    fields: [
      { field: 'name', label: '店铺名称', type: 'string', interface: 'input', required: true },
      // 地址仅作展示列：由触发器从 geo.address 自动写入（见 setupShopGeoTrigger）。
      // 后台“唯一地址输入”就是 map-picker 内部的搜索框，故此处隐藏，避免与地图输入框重复。
      { field: 'address', label: '地址', type: 'string', interface: 'input', hidden: true, note: '由 geo.address 经触发器自动写入，前台读取用；后台编辑请用下方地图选点输入框' },
      // 位置：自定义后台接口 map-picker（Leaflet + OSM），点选/搜索把 {lat,lng,address} 写入 geo 字段；
      // 再由数据库触发器把 geo 同步回 lat / lng / address（见 setupShopGeoTrigger）。
      // 这样前端 MapView 与公开 API 读取 lat / lng / address 的方式完全不变。
      { field: 'geo', label: '位置（地图选点 / 地址）', type: 'json', interface: 'map-picker', width: 'full', options: { height: 360, defaultZoom: 13, defaultLat: 35.6812, defaultLng: 139.7671, searchPlaceholder: '输入地址或地名，自动定位…' }, note: '地图选点 / 搜索地址的唯一入口：自动写入经纬度与地址（address 由触发器同步到 address 列）' },
      { field: 'lat', label: '纬度', type: 'decimal', interface: 'input', decimal: { precision: 10, scale: 7 }, hidden: true, note: '纬度（-90~90），由 geo 触发器自动写入' },
      { field: 'lng', label: '经度', type: 'decimal', interface: 'input', decimal: { precision: 10, scale: 7 }, hidden: true, note: '经度（-180~180），由 geo 触发器自动写入' },
      { field: 'phone', label: '联系电话', type: 'string', interface: 'input' },
      { field: 'business_hours', label: '营业时间', type: 'string', interface: 'input' },
      { field: 'description', label: '店铺介绍', type: 'text', interface: 'textarea' },
      { field: 'image', label: '店铺图片', type: 'uuid', interface: 'file', related: 'directus_files' },
      { field: 'sort', label: '排序', type: 'integer', interface: 'sort', default: 0 },
      {
        field: 'status',
        label: '发布状态',
        type: 'string',
        interface: 'select-dropdown',
        default: 'published',
        options: { choices: CHOICES({ published: '已发布', draft: '草稿' }) },
      },
    ],
  },
  {
    name: 'info_pages',
    label: '站点信息页',
    icon: 'policy',
    note: '审核用信息页（运营信息 / 个人信息收集 / 利用规则 / 数据使用）',
    sortField: 'sort',
    displayTemplate: '{{title}}',
    fields: [
      {
        field: 'page_key',
        label: '页面标识',
        type: 'string',
        interface: 'select-dropdown',
        required: true,
        options: {
          choices: CHOICES({
            operation: '运营信息',
            'personal-info': '个人信息收集',
            terms: '利用规则',
            'data-usage': '数据使用',
          }),
        },
        note: '页面标识（唯一，前端路由 /info/<page_key> 与页脚入口据此匹配）',
      },
      { field: 'title', label: '页面标题', type: 'string', interface: 'input', required: true },
      {
        field: 'body',
        label: '正文',
        type: 'text',
        interface: 'input-rich-text-md',
        note: '正文（富文本 Markdown/HTML）',
      },
      { field: 'sort', label: '排序', type: 'integer', interface: 'sort', default: 0 },
      {
        field: 'status',
        label: '发布状态',
        type: 'string',
        interface: 'select-dropdown',
        default: 'draft',
        options: {
          choices: CHOICES({ draft: '草稿', published: '已发布', archived: '已归档' }),
        },
      },
    ],
  },
  {
    name: 'site_settings',
    label: '站点设置',
    icon: 'settings',
    note: '网站基本信息（单例）',
    singleton: true,
    displayTemplate: '{{site_name}}',
    fields: [
      { field: 'site_name', label: '站点名称', type: 'string', interface: 'input' },
      { field: 'logo', label: '站点 Logo', type: 'uuid', interface: 'file', related: 'directus_files' },
      { field: 'intro', label: '站点简介', type: 'text', interface: 'textarea' },
      { field: 'x_account', label: 'X 账号', type: 'string', interface: 'input', note: 'X 账号' },
      { field: 'contact_email', label: '联系邮箱', type: 'string', interface: 'input' },
      { field: 'data_notice', label: '数据说明', type: 'string', interface: 'input' },
      { field: 'privacy_policy', label: '隐私政策', type: 'text', interface: 'input-rich-text-md' },
    ],
  },
]

async function ensureCollection(def) {
  const translations = buildTranslations({
    zh: def.label,
    ja: COLLECTION_LABELS_JA[def.name],
  })
  if (await collectionExists(def.name)) {
    // 存量环境：同步图标/说明/多语言名，保证界面展示一致
    await api('PATCH', `/collections/${def.name}`, {
      meta: {
        icon: def.icon || 'box',
        note: def.note || '',
        display_template: def.displayTemplate || '{{id}}',
        translations,
      },
    })
    console.log(`· 集合已存在，元数据已同步：${def.name}`)
    return
  }
  await api('POST', '/collections', {
    collection: def.name,
    meta: {
      icon: def.icon || 'box',
      note: def.note || '',
      display_template: def.displayTemplate || '{{id}}',
      singleton: def.singleton || false,
      translations,
    },
    schema: { name: def.name },
  })
  console.log(`+ 创建集合：${def.name}`)
}

// 字段元数据（新建与同步共用，保证两处一致）
function buildFieldMeta(collection, f) {
  const isRelational = !!f.related
  const isFile = f.interface === 'file'
  const isUser = f.interface === 'user'
  return {
    interface: f.interface,
    required: !!f.required,
    readonly: f.readonly ?? false,
    hidden: f.hidden ?? false,
    width: f.width ?? 'half',
    note: f.note || '',
    options: f.options || {},
    special: f.special || null,
    display: f.display ?? (isFile ? 'image' : isUser ? 'user' : isRelational ? 'related-values' : null),
    display_options:
      f.displayOptions ??
      (isRelational && !isFile && !isUser ? { template: '{{name}}' } : null),
    translations: buildTranslations({
      zh: f.label,
      ja: FIELD_LABELS_JA[collection]?.[f.field],
    }),
  }
}

async function ensureField(collection, f) {
  if (await fieldExists(collection, f.field)) return
  const isRelational = !!f.related
  const schema = isRelational
    ? { is_nullable: !f.required, default_value: null }
    : f.type === 'decimal'
      ? {
          is_nullable: f.nullable ?? false,
          default_value: f.default ?? null,
          numeric_precision: f.decimal?.precision ?? 10,
          numeric_scale: f.decimal?.scale ?? 2,
        }
      : {
          is_nullable: f.nullable ?? !f.required,
          default_value: f.default ?? null,
        }
  await api('POST', `/fields/${collection}`, {
    field: f.field,
    type: f.type,
    meta: buildFieldMeta(collection, f),
    schema,
  })
  console.log(`+ 字段：${collection}.${f.field}`)
}

// 存量字段修正：把 interface / options / 中文名 同步成声明里的最新值。
// 典型用途：早期用错 interface 的 M2O 字段（relational）修正为下拉选择。
async function syncFieldMeta(collection, f) {
  if (!(await fieldExists(collection, f.field))) return
  await api('PATCH', `/fields/${collection}/${f.field}`, {
    meta: buildFieldMeta(collection, f),
  })
}

// 注意：/relations 端点不支持 filter 查询（会忽略 filter 返回全部），
// 早期版本据此判断“已存在”，导致关系从未真正建立。这里直接查库判断。
async function relationExists(collection, field) {
  const pool = new Pool(DB)
  try {
    const r = await pool.query(
      'SELECT 1 FROM directus_relations WHERE many_collection = $1 AND many_field = $2 LIMIT 1',
      [collection, field],
    )
    return (r.rowCount ?? 0) > 0
  } finally {
    await pool.end()
  }
}

// M2M 关系的 junction_field 是必需元数据（见 ensureM2M 注释）。
// 存量环境可能缺这一列，也可能缺 FK 约束（PATCH /relations 会 DROP 外键后重建，
// 早期实现漏传 schema 就会让外键消失）。这里把「元数据 + 外键」一起校验，
// 任一不对才发一次 PATCH；都已正确则完全不写库（幂等）。
//
// ⚠ PATCH /relations 的实现是「先 DROP 外键 → 改类型 → 再 ADD 外键」，
// 外键的 on_delete 只能从请求体的 schema 里拿，所以请求必须带上 schema。
async function ensureJunctionSide(side, onDelete = 'NO ACTION') {
  const want = side.meta.junction_field
  const pool = new Pool(DB)
  let current = null
  let hasFk = false
  try {
    const r = await pool.query(
      'SELECT junction_field FROM directus_relations WHERE many_collection = $1 AND many_field = $2 LIMIT 1',
      [side.collection, side.field],
    )
    current = r.rows[0]?.junction_field ?? null
    const fk = await pool.query(
      `SELECT 1 FROM pg_constraint
        WHERE contype = 'f' AND conrelid = $1::regclass
          AND conkey = ARRAY[(
            SELECT attnum FROM pg_attribute
             WHERE attrelid = $1::regclass AND attname = $2
          )]`,
      [side.collection, side.field],
    )
    hasFk = (fk.rowCount ?? 0) > 0
  } finally {
    await pool.end()
  }
  if (current === want && hasFk) return null
  await api('PATCH', `/relations/${side.collection}/${side.field}`, {
    collection: side.collection,
    field: side.field,
    related_collection: side.related_collection,
    schema: { on_delete: onDelete },
    meta: {
      many_collection: side.collection,
      many_field: side.field,
      one_collection: side.related_collection,
      ...side.meta,
    },
  })
  return { junctionFieldFixed: current !== want, foreignKeyRestored: !hasFk }
}

async function ensureRelation(collection, field, related, required) {
  if (await relationExists(collection, field)) return
  await api('POST', '/relations', {
    collection,
    field,
    related_collection: related,
    // 必填外键不能用 SET NULL（列 NOT NULL），统一用 NO ACTION
    schema: { on_delete: required ? 'NO ACTION' : 'SET NULL' },
    meta: {
      many_collection: collection,
      many_field: field,
      one_collection: related,
      one_field: null,
      one_deselect_action: 'nullify',
    },
  })
  console.log(`+ 关系：${collection}.${field} → ${related}`)
}

async function setupIndexes() {
  const pool = new Pool(DB)
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uniq_card_ip_series_sub_code
       ON cards (ip_id, series_id, sub_series_id, code) WHERE code IS NOT NULL;`,
    )
    await pool.query(
      'CREATE INDEX IF NOT EXISTS cards_name_trgm ON cards USING GIN (name gin_trgm_ops);',
    )
    await pool.query(
      'CREATE INDEX IF NOT EXISTS cards_code_trgm ON cards USING GIN (code gin_trgm_ops);',
    )
    // 信息页按 page_key 唯一定位（前端 /info/<page_key> 直接按标识查一条）
    await pool.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uniq_info_pages_page_key ON info_pages (page_key);',
    )
    console.log('✓ 索引已就绪（组合唯一 + pg_trgm GIN + info_pages 唯一标识）')
  } finally {
    await pool.end()
  }
}

// cards 的创建/更新时间由数据库层保障（Directus 11 对“后期新增的 special 字段”
// 不会在 API 层自动写入，故用列默认值 + 更新触发器兜底）。
async function setupCardTimestamps() {
  const pool = new Pool(DB)
  try {
    await pool.query(
      'ALTER TABLE cards ALTER COLUMN date_created SET DEFAULT now();',
    )
    await pool.query(
      'ALTER TABLE cards ALTER COLUMN date_updated SET DEFAULT now();',
    )
    await pool.query(`
      CREATE OR REPLACE FUNCTION cards_touch_updated() RETURNS trigger AS $f$
      BEGIN
        NEW.date_updated := now();
        RETURN NEW;
      END;
      $f$ LANGUAGE plpgsql;
    `)
    await pool.query(
      'DROP TRIGGER IF EXISTS trg_cards_touch_updated ON cards;',
    )
    await pool.query(`
      CREATE TRIGGER trg_cards_touch_updated
        BEFORE UPDATE ON cards
        FOR EACH ROW EXECUTE FUNCTION cards_touch_updated();
    `)
    console.log('✓ cards 时间戳保障已就绪（默认值 + 更新触发器）')
  } finally {
    await pool.end()
  }
}

// 后台经纬度改用「地图选点」接口写入 geo(json: {lat,lng})，
// 通过触发器把 geo 同步回 decimallat / lng 两列，
// 这样前端 MapView 与公开 API 读取 lat / lng 的方式完全不变。
async function setupShopGeoTrigger() {
  const pool = new Pool(DB)
  try {
    // 放宽 address 长度，避免 Nominatim 反查的 display_name 超 255 被截断
    await pool.query('ALTER TABLE shops ALTER COLUMN address TYPE text;')
    await pool.query(`
      CREATE OR REPLACE FUNCTION shops_sync_geo() RETURNS trigger AS $f$
      BEGIN
        -- 仅当 geo 真正发生变化时才回写，避免误覆盖
        IF NEW.geo::jsonb IS DISTINCT FROM OLD.geo::jsonb THEN
          IF NEW.geo IS NULL THEN
            NEW.lat := NULL;
            NEW.lng := NULL;
            NEW.address := NULL;
          ELSE
            NEW.lat := (NEW.geo->>'lat')::numeric;
            NEW.lng := (NEW.geo->>'lng')::numeric;
            -- geo.address 为空时保留原有 address，避免误清空
            NEW.address := COALESCE(NULLIF(btrim(NEW.geo->>'address'), ''), NEW.address);
          END IF;
        END IF;
        RETURN NEW;
      END;
      $f$ LANGUAGE plpgsql;
    `)
    await pool.query('DROP TRIGGER IF EXISTS trg_shops_sync_geo ON shops;')
    await pool.query(`
      CREATE TRIGGER trg_shops_sync_geo
        BEFORE INSERT OR UPDATE ON shops
        FOR EACH ROW EXECUTE FUNCTION shops_sync_geo();
    `)
    console.log('✓ shops 地理信息同步已就绪（geo → lat/lng/address 触发器）')
  } finally {
    await pool.end()
  }
}

async function setupPermissions() {
  try {
    // Directus 11：Public 角色不是普通角色行，而是 directus_access.role = NULL
    // （即未认证访问）。因此策略通过 role:null 的 access 条目绑定到公共访问。
    const findPolicy = async (name) => {
      const r = await api(
        'GET',
        `/policies?filter[name][_eq]=${encodeURIComponent(name)}&limit=1`,
      )
      return r?.data?.[0]?.id || null
    }
    const ensurePolicy = async (name, icon) => {
      const existing = await findPolicy(name)
      if (existing) {
        console.log(`· 策略已存在：${name}`)
        return existing
      }
      const r = await api('POST', '/policies', { name, icon })
      console.log(`+ 创建策略：${name}`)
      return r.data.id
    }
    const ensurePermission = async (pid, p) => {
      const existing = await api(
        'GET',
        `/permissions?filter[policy][_eq]=${pid}&filter[collection][_eq]=${p.collection}&filter[action][_eq]=${p.action}&limit=1`,
      )
      const body = {
        fields: p.fields || ['*'],
        permissions: p.permissions || {},
        validation: p.validation || {},
        presets: p.presets || {},
      }
      if (existing?.data?.length) {
        const id = existing.data[0].id
        await api('PATCH', `/permissions/${id}`, body)
        console.log(`· 更新权限：${p.collection}/${p.action}`)
        return
      }
      await api('POST', '/permissions', { policy: pid, ...p })
    }
    const ensureAccess = async (pid, sort) => {
      const list = await api('GET', `/access?filter[policy][_eq]=${pid}&limit=100`)
      const has = (list?.data || []).some((a) => a.role === null || a.role === 'public')
      if (has) {
        console.log('· Public 访问绑定已存在')
        return
      }
      await api('POST', '/access', { role: null, policy: pid, sort })
      console.log('+ 绑定 Public 访问（role=null）')
    }

    const readPid = await ensurePolicy('Public Read Content', 'visibility')
    const readCols = [
      { collection: 'ips', permissions: { status: { _eq: true } } },
      { collection: 'series', permissions: { status: { _eq: true } } },
      { collection: 'sub_series', permissions: { status: { _eq: true } } },
      { collection: 'rarities', permissions: { status: { _eq: true } } },
      { collection: 'cards', permissions: { status: { _eq: 'published' } } },
      {
        // 卡牌图片是 M2M，匿名读 cards.images 需要关联表的读权限
        collection: 'cards_images',
        permissions: {},
        fields: ['cards_id', 'directus_files_id', 'sort'],
      },
      { collection: 'banners', permissions: { status: { _eq: 'published' } } },
      { collection: 'announcements', permissions: { status: { _eq: 'published' } } },
      { collection: 'shops', permissions: { status: { _eq: 'published' } } },
      { collection: 'info_pages', permissions: { status: { _eq: 'published' } } },
      { collection: 'site_settings', permissions: {} },
      {
        collection: 'directus_files',
        permissions: {},
        fields: ['id', 'title', 'width', 'height', 'type', 'filesize'],
      },
    ]
    for (const c of readCols) {
      await ensurePermission(readPid, {
        collection: c.collection,
        action: 'read',
        fields: c.fields || ['*'],
        permissions: c.permissions || {},
        validation: {},
        presets: {},
      })
    }
    const msgPid = await ensurePolicy('Public Message Create', 'forum')
    await ensurePermission(msgPid, {
      collection: 'messages',
      action: 'create',
      fields: ['content', 'contact_name', 'contact_info'],
      permissions: {},
      validation: {},
      presets: { status: 'new' },
    })
    await ensureAccess(readPid, 1)
    await ensureAccess(msgPid, 2)
    console.log('✓ Public 权限已配置（读公开内容 + 留言创建，role=null）')
  } catch (err) {
    console.warn('⚠ 权限配置未完成（可于后台手动配置）：', err.message)
  }
}

// 文件字段（banners.image / site_settings.logo）早期用 varchar 存 uuid，
// 与 directus_files.id（uuid）类型不一致，导致无法建立外键关系。这里统一为 uuid。
async function setupFileFieldTypes() {
  const pool = new Pool(DB)
  try {
    for (const [table, col] of [
      ['banners', 'image'],
      ['site_settings', 'logo'],
    ]) {
      const r = await pool.query(
        `SELECT data_type FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2`,
        [table, col],
      )
      if (r.rows[0]?.data_type === 'character varying') {
        // 旧列可能带 varchar 默认值（如 ''），直接改类型会报 cast 失败，先摘掉
        await pool.query(
          `ALTER TABLE ${table} ALTER COLUMN ${col} DROP DEFAULT;`,
        )
        await pool.query(
          `ALTER TABLE ${table} ALTER COLUMN ${col} TYPE uuid USING ${col}::uuid;`,
        )
        console.log(`✓ 字段类型修正：${table}.${col} → uuid`)
      }
    }
  } finally {
    await pool.end()
  }
}

// 后台界面语言：项目默认语言设为简体中文；管理员账号同步切到中文。
// Directus 自带多语言，这里只是把默认值落到 zh-CN（用户仍可在个人设置里改）。
async function setupSettings() {
  try {
    await api('PATCH', '/settings', { default_language: 'zh-CN' })
    console.log('✓ 项目默认语言：简体中文（zh-CN）')
  } catch (err) {
    console.warn('⚠ 项目默认语言设置失败：', err.message)
  }
  try {
    await api('PATCH', '/users/me', { language: 'zh-CN' })
    console.log('✓ 管理员账号语言：简体中文')
  } catch (err) {
    console.warn('⚠ 管理员账号语言设置失败（可在后台个人设置手动切换）：', err.message)
  }
}

async function clearCache() {
  try {
    await api('POST', '/utils/cache/clear')
    console.log('✓ 已清理缓存（后台刷新即生效）')
  } catch {
    /* 清理失败不影响结果，刷新页面同样可以重新拉取字段元数据 */
  }
}

// 新增字段后若忘记补日文标签，这里给出提示（不影响执行）
function checkTranslationCoverage() {
  const missing = []
  for (const def of collections) {
    if (!COLLECTION_LABELS_JA[def.name]) missing.push(def.name)
    for (const f of def.fields) {
      if (!FIELD_LABELS_JA[def.name]?.[f.field]) {
        missing.push(`${def.name}.${f.field}`)
      }
    }
  }
  if (missing.length) {
    console.warn(
      `⚠ 缺少日文标签（切到日语会回退为字段名）：${missing.join(', ')}`,
    )
  } else {
    console.log('✓ 中/日标签覆盖完整')
  }
}

// ── M2M：卡牌 ↔ 商品图片 ──
// Directus 的 Files 接口只支持 alias 字段（types: ['alias']），因此图片不能是普通 json 列。
// 建表顺序不能颠倒：迁移旧数据 → 删旧列 → 建两条关系 → 建 alias 字段。
// 若先建 alias、后建关系，Directus 会把 alias 当真实列查询（column does not exist）。
const M2M_DEFS = [
  {
    aliasCollection: 'cards',
    aliasField: 'images',
    junction: 'cards_images',
    junctionField: 'cards_id',
    relatedCollection: 'directus_files',
    relatedField: 'directus_files_id',
    sortField: 'sort',
    label: '商品图片',
    labelJa: '商品画像',
    note: '商品图片（可上传/多选/排序，第一张为主图）',
    template: '{{directus_files_id.filename_download}}',
  },
]

async function ensureM2M(def) {
  // 1. 关联表（隐藏集合）
  if (!(await collectionExists(def.junction))) {
    await api('POST', '/collections', {
      collection: def.junction,
      meta: {
        hidden: true,
        icon: 'photo_library',
        note: '卡牌 ↔ 图片（M2M 关联表，自动维护）',
        translations: buildTranslations({
          zh: '卡牌图片关联',
          ja: 'カード画像関連',
        }),
      },
      schema: {},
    })
    console.log(`+ 关联集合：${def.junction}`)
  }

  // 2. 关联表字段
  const jFields = [
    {
      field: def.junctionField,
      type: 'integer',
      schema: { is_nullable: false },
      meta: { hidden: true },
    },
    {
      field: def.relatedField,
      type: 'uuid',
      schema: { is_nullable: false },
      meta: { hidden: true },
    },
    {
      field: def.sortField,
      type: 'integer',
      schema: { is_nullable: true, default_value: 0 },
      meta: { hidden: true },
    },
  ]
  for (const f of jFields) {
    if (await fieldExists(def.junction, f.field)) continue
    await api('POST', `/fields/${def.junction}`, f)
  }

  // 3. 升级路径：旧的 json 数组列 → 关联表，然后删掉旧列
  const existing = await api(
    'GET',
    `/fields/${def.aliasCollection}/${def.aliasField}`,
  ).catch(() => null)
  const isRealColumn =
    !!existing?.data?.schema && existing.data.type !== 'alias'
  if (isRealColumn) {
    const pool = new Pool(DB)
    try {
      const res = await pool.query(`
        INSERT INTO ${def.junction} (${def.junctionField}, ${def.relatedField}, ${def.sortField})
        SELECT c.id, t.value::uuid, (t.ord - 1)::int
        FROM ${def.aliasCollection} c
        CROSS JOIN LATERAL json_array_elements_text(c.${def.aliasField}) WITH ORDINALITY AS t(value, ord)
        WHERE c.${def.aliasField} IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM ${def.junction} j
            WHERE j.${def.junctionField} = c.id
              AND j.${def.relatedField} = t.value::uuid
          );
      `)
      console.log(
        `✓ 迁移 ${def.aliasCollection}.${def.aliasField} → ${def.junction}（${res.rowCount} 条）`,
      )
    } finally {
      await pool.end()
    }
    await api('DELETE', `/fields/${def.aliasCollection}/${def.aliasField}`)
    console.log(`✓ 已删除旧字段：${def.aliasCollection}.${def.aliasField}`)
  }

  // 4. 两条关系（必须早于 alias 字段）
  // junction_field 是 M2M 的**必需元数据**，不是可选装饰：
  // 后台 list-m2m 用 useRelationM2M() 找关系时，条件是
  //   related_collection === 当前集合 && one_field === 当前字段 && **meta.junction_field 非空**
  // 缺 junction_field 就找不到关系 → relationInfo 为 undefined → 界面退化成
  // 一条警告「The relationship is not configured properly or you don't have permission to access it」。
  // 两条关系各自指向对方字段，互为 junction_field（Directus 后台建 M2M 时也是这么写的）。
  const junctionSide = {
    collection: def.junction,
    field: def.junctionField,
    related_collection: def.aliasCollection,
    schema: { on_delete: 'NO ACTION' },
    meta: {
      one_field: def.aliasField,
      one_deselect_action: 'nullify',
      sort_field: def.sortField,
      junction_field: def.relatedField,
    },
  }
  const relatedSide = {
    collection: def.junction,
    field: def.relatedField,
    related_collection: def.relatedCollection,
    schema: { on_delete: 'NO ACTION' },
    meta: {
      one_deselect_action: 'nullify',
      junction_field: def.junctionField,
    },
  }
  for (const side of [junctionSide, relatedSide]) {
    if (await relationExists(side.collection, side.field)) {
      // 存量修复：早期版本建关系时漏了 junction_field，这里补上（幂等）
      const fixed = await ensureJunctionSide(side)
      if (fixed?.junctionFieldFixed) {
        console.log(
          `✓ 修复 M2M 元数据：${side.collection}.${side.field}.junction_field = ${side.meta.junction_field}`,
        )
      }
      if (fixed?.foreignKeyRestored) {
        console.log(`✓ 补建外键：${side.collection}.${side.field} → ${side.related_collection}`)
      }
      continue
    }
    await api('POST', '/relations', side)
    console.log(`+ M2M 关系：${side.collection}.${side.field} → ${side.related_collection}`)
  }

  // 5. alias 字段（M2M 在 cards 上的虚拟字段，后台可上传/多选/排序）
  const aliasMeta = {
    special: ['m2m'],
    interface: 'list-m2m',
    options: { template: def.template },
    display: 'related-values',
    display_options: { template: def.template },
    note: def.note,
    width: 'full',
    translations: buildTranslations({ zh: def.label, ja: def.labelJa }),
  }
  if (await fieldExists(def.aliasCollection, def.aliasField)) {
    await api('PATCH', `/fields/${def.aliasCollection}/${def.aliasField}`, {
      meta: aliasMeta,
    })
  } else {
    await api('POST', `/fields/${def.aliasCollection}`, {
      field: def.aliasField,
      type: 'alias',
      meta: aliasMeta,
    })
    console.log(`+ M2M 字段：${def.aliasCollection}.${def.aliasField}`)
  }
}

// 存量环境清理：站点设置不再承载店铺信息，移除这些字段（连同其数据）。
// 幂等：字段不存在则跳过。
const DROP_FIELDS = [
  { collection: 'site_settings', field: 'shop_address' },
  { collection: 'site_settings', field: 'contact_phone' },
  { collection: 'site_settings', field: 'business_hours' },
]
async function dropField(collection, field) {
  if (!(await fieldExists(collection, field))) return
  await api('DELETE', `/fields/${collection}/${field}`)
  console.log(`- 已移除字段：${collection}.${field}`)
}

async function main() {
  await login()
  checkTranslationCoverage()
  for (const def of collections) {
    await ensureCollection(def)
  }
  for (const def of collections) {
    for (const f of def.fields) {
      await ensureField(def.name, f)
      await syncFieldMeta(def.name, f)
    }
    // 设置 sort_field
    if (def.sortField) {
      await api('PATCH', `/collections/${def.name}`, {
        meta: { sort_field: def.sortField },
      })
    }
  }
  // 文件字段先统一为 uuid，再建关系（顺序不能颠倒，否则外键类型不匹配）
  await setupFileFieldTypes()
  // M2M（商品图片）：含旧 json 列迁移 + 关系 + alias 字段
  for (const def of M2M_DEFS) await ensureM2M(def)
  // 关系（M2O）
  for (const def of collections) {
    for (const f of def.fields) {
      if (f.related) await ensureRelation(def.name, f.field, f.related, f.required)
    }
  }
  await setupIndexes()
  await setupCardTimestamps()
  await setupShopGeoTrigger()
  for (const d of DROP_FIELDS) await dropField(d.collection, d.field)
  await setupPermissions()
  await setupSettings()
  await clearCache()
  console.log('\n✅ 数据模型落地完成。下一步：npm run directus:seed')
}

main().catch((e) => {
  console.error('❌ bootstrap 失败：', e.message)
  process.exit(1)
})
