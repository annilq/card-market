// 语言在运行时的唯一来源是「当前 URL 路径」。这里不再维护一份 React state，
// 也不提供 Provider：派生而非同步，SSR 与客户端读到的 pathname 一致，
// 因此不会出现服务端渲染一种语言、水合后变成另一种的闪变。
import { useRouterState } from '@tanstack/react-router'
import { DEFAULT_LOCALE, LOCALES, resolveLocaleParam } from './locales'
import type { Locale } from './locales'
import { translate } from './messages'
import type { MessageKey, MessageVars } from './messages'

export type { Locale } from './locales'
export type { MessageKey, MessageVars } from './messages'
export { LOCALES, DEFAULT_LOCALE }

/** 当前语言。未知/缺省语言段一律回退到默认语言。 */
export function useLocale(): Locale {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const segment = pathname.split('/')[1]
  return resolveLocaleParam(segment || undefined) ?? DEFAULT_LOCALE
}

export interface Translator {
  (key: MessageKey, vars?: MessageVars): string
  locale: Locale
}

/** 当前语言的翻译函数。同一 locale 下引用稳定，可直接进依赖数组。 */
export function useT(): Translator {
  const locale = useLocale()
  const cached = cacheFor(locale)
  return cached
}

const CACHE = new Map<Locale, Translator>()

function cacheFor(locale: Locale): Translator {
  const existing = CACHE.get(locale)
  if (existing) return existing
  const t = ((key: MessageKey, vars?: MessageVars) =>
    translate(locale, key, vars)) as Translator
  t.locale = locale
  CACHE.set(locale, t)
  return t
}

/** 按当前语言格式化日期，避开 SSR 与浏览器时区差异导致的抖动。 */
export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(LOCALES[locale].intl, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  }).format(date)
}
