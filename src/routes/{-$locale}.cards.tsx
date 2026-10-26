import { createFileRoute, Outlet } from '@tanstack/react-router'

// /cards 作为布局路由：仅渲染 <Outlet/>，列表内容在 cards.index.tsx，
// 详情（cards.$id.tsx）作为同级子路由嵌套在 Outlet 中——这样点击卡片跳转到
// /cards/$id 时，详情页会独立渲染，而不是被列表页「吃掉」。
export const Route = createFileRoute('/{-$locale}/cards')({
  component: CardsLayout,
})

function CardsLayout() {
  return <Outlet />
}
