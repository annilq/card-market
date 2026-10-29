import { defineInterface } from '@directus/extensions-sdk'
import InterfaceMapPicker from './interface.vue'

export default defineInterface({
  id: 'map-picker',
  name: 'Map Picker',
  icon: 'map',
  description:
    '在地图上点选 / 拖动标记，或输入地址搜索，自动写入「纬度 lat」与「经度 lng」两个字段。基于 Leaflet + OpenStreetMap，无需 Mapbox token。',
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
  ],
})
