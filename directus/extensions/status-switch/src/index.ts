import { defineDisplay } from '@directus/extensions-sdk'
import StatusSwitch from './display.vue'

export default defineDisplay({
  id: 'status-switch',
  name: 'Status Switch',
  icon: 'toggle_on',
  description:
    '列表页可直接点击的状态徽章：在 草稿 / 已发布 / 已归档 等状态间一键切换，无需进入详情页。状态选项自动读取该字段的接口选项（select-dropdown 的 choices）。',
  component: StatusSwitch,
  // 兼容字符串（status: draft/published…）与布尔（ips/series… 的「启用」）等类型
  types: ['string', 'integer', 'boolean'],
  options: [
    {
      field: 'fieldName',
      name: '要更新的字段名',
      type: 'string',
      note: '留空则使用当前列字段（通常是 status）。仅在把本显示挂到非 status 字段时需要改。',
      meta: { interface: 'input', width: 'full' },
      schema: { default_value: null },
    },
    {
      field: 'choices',
      name: '状态选项（可选，留空读取接口选项）',
      type: 'json',
      note: '形如 [{ "value": "draft", "text": "草稿", "color": "#f0a020" }]。留空时自动使用字段接口选项，并按值匹配默认配色。',
      meta: { interface: 'list', options: { template: '{{text}}' }, width: 'full' },
      schema: { default_value: null },
    },
  ],
})
