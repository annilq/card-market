# card-market 项目长期约定

## 技术栈与运行
- 前端：TanStack Start（SSR）+ React，`src/routes/*`、`src/lib/directus.ts`（公开角色直连 Directus REST）。
- 后端：Directus 11（容器 `cardmarket-directus`，:8055）+ 本机原生 PostgreSQL（:5432, directus/directus）。
- 开发：`npm run dev` → 127.0.0.1:3001；生产：`npm run build` + `node prod-server.mjs` → :3000。
- 数据模型脚本：`npm run directus:bootstrap`（幂等，含集合/字段/关系/索引/权限/语言）、`npm run directus:seed`（有数据则跳过）。
- 后台账号：admin@example.com / admin12345。

## 数据模型约定（易踩坑）
- **M2O 关联字段必须用 `interface: 'select-dropdown-m2o'`**（+ `options.template: '{{name}}'`）。
  `relational` 只是 display，误当 interface 会让后台退化成手输主键。
- **`/relations` 端点忽略 filter**（总返回全量），判断关系是否存在必须直查 `directus_relations`
  （many_collection + many_field），否则关系永远建不出来。
- **`cards.images` 是 M2M**：关联表 `cards_images`（cards_id / directus_files_id / sort），
  `cards.images` 是 `type: alias` + `special: ['m2m']` + `interface: 'list-m2m'`。
  Directus 的 Files 接口 `types: ['alias']`，不能挂在真实 json 列上。
- **M2M 建表顺序不可颠倒**：建关联表 → 迁移旧数据 → 删旧 json 列 → 建两条 relations → 建 alias 字段。
  顺序错了会出现「同名字段返回两条」或 `column cards.images does not exist`。
- 文件字段（banners.image / site_settings.logo）列类型必须是 `uuid`（与 directus_files.id 一致），
  改类型需先 `DROP DEFAULT` 再 `USING col::uuid`。
- 必填外键 `on_delete` 用 `NO ACTION`；可空用 `SET NULL`。
- Public 读 `cards.images` 需要额外授予 `cards_images` 的 read（cards_id/directus_files_id/sort）。
- `cards.date_created/date_updated` 由 DB 列默认值 `now()` + BEFORE UPDATE 触发器维护
  （Directus 对后期新增的 special 字段不会自动写）；`user_created` 保持可空、手工回填。

## 后台本地化
- `directus_settings.default_language = 'zh-CN'`；管理员账号 language 同为 zh-CN。
- 集合中文名写在 `collections[].label`；日文名在 `COLLECTION_LABELS_JA` / `FIELD_LABELS_JA`
  （bootstrap.mjs），由 `buildTranslations()` 生成 `meta.translations`（zh-CN + ja-JP）。
- 新增字段后 bootstrap 会打印缺失日文标签的清单（`checkTranslationCoverage`）。
- `select-dropdown` 的 choices 文本是固定字符串，不随界面语言切换（如需多语言选项要改数据模型）。

## 前端取图
- `CARD_FIELDS` 请求 `images.directus_files_id`，`normalizeCard()` 归一化为 `string[]`；
  组件层（CardCard / cards.$id）只认 `card.images` 的 id 数组。
