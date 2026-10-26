import { createFileRoute, Outlet } from '@tanstack/react-router'

// /announcements 作为布局路由：仅渲染 <Outlet/>，列表在 announcements.index.tsx，
// 详情（announcements.$id.tsx）作为同级子路由嵌套在 Outlet 中。
export const Route = createFileRoute('/announcements')({
  component: AnnouncementsLayout,
})

function AnnouncementsLayout() {
  return <Outlet />
}
