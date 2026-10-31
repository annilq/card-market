import { defineInterface } from '@directus/extensions-sdk'
import InterfaceMapPicker from './interface.vue'

export default defineInterface({
  id: 'map-picker',
  name: 'Map Picker',
  icon: 'map',
  description:
    '在地图上点选 / 拖动标记，或输入地址搜索（多个候选时由用户选择）。基于 Leaflet + OpenStreetMap，无需 Mapbox token。',
  component: InterfaceMapPicker,
  // 绑定到 decimal（lat 字段）即可；组件内部会把经度写回兄弟字段 lng。
  types: ['decimal', 'float', 'integer', 'numeric', 'string', 'json'],
  group: 'selection',
  options: [
    {
      field: 'height',
      name: '地图高度 (px)',
      type: 'integer',
      meta: { interface: 'input', width: 'half' },
      schema: { default_value: 360 },
    },
    {
      field: 'defaultZoom',
      name: '默认缩放级别',
      type: 'integer',
      meta: { interface: 'input', width: 'half' },
      schema: { default_value: 13 },
    },
    {
      field: 'defaultLat',
      name: '默认定位纬度',
      type: 'float',
      meta: { interface: 'input', width: 'half' },
      schema: { default_value: 35.6812 },
    },
    {
      field: 'defaultLng',
      name: '默认定位经度',
      type: 'float',
      meta: { interface: 'input', width: 'half' },
      schema: { default_value: 139.7671 },
    },
    {
      field: 'searchPlaceholder',
      name: '搜索框占位符',
      type: 'string',
      meta: { interface: 'input' },
      schema: { default_value: '输入地址或地名，回车搜索…' },
    },
    {
      field: 'searchDebounce',
      name: '地址自动搜索防抖阈值 (ms)',
      type: 'integer',
      note: '输入地址后多久才触发自动定位；0 表示输入即搜。',
      meta: { interface: 'input', width: 'half' },
      schema: { default_value: 600 },
    },
    {
      field: 'reverseOnClick',
      name: '点击地图时反查地址回填',
      type: 'boolean',
      meta: { interface: 'boolean', width: 'half' },
      schema: { default_value: true },
    },
    {
      field: 'searchLimit',
      name: '地址搜索候选数量',
      type: 'integer',
      note: '正向搜索返回的候选结果上限；多于 1 个时由用户在列表中选择其一。',
      meta: { interface: 'input', width: 'half' },
      schema: { default_value: 5 },
    },
  ],
})
