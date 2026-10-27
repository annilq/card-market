import { useEffect, useState } from 'react'

/**
 * 系统是否要求「减少动态效果」。
 *
 * 为什么不只靠 CSS：CSS 媒体查询能关掉 transition 与 animation，但关不掉
 * **由 JS 驱动的循环**——banner 自动轮播就是典型。它每 5 秒改变一次页面内容，
 * 对前庭敏感的用户来说是最难受的一类运动，而 `@media` 管不到 `setInterval`。
 *
 * 初始值取 `false`（服务端与首帧），挂载后再读真实值：服务端没有 `matchMedia`，
 * 若在渲染期读它，SSR 输出与客户端首帧会不一致。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    // 用户在系统设置里改了偏好时立即生效，不需要刷新页面。
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return reduced
}
