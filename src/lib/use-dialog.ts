import { useEffect, useRef } from 'react'

/**
 * 对话框的三件公共行为，两个浮层（筛选面板、卡牌弹窗）共用：
 * Esc 关闭、打开期间锁住背景滚动、关闭后把焦点还回触发它的那个元素。
 *
 * 返回值挂在浮层容器上：打开时焦点要进浮层，否则读屏与键盘用户
 * 还站在身后的那张页面上。
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    // 锁背景滚动：手指在浮层里滑动不该把身后的页面一起带走。
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [onClose])

  return ref
}
