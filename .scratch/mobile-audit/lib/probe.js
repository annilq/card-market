// 在页面里跑的探针（字符串形式注入 CDP Runtime.evaluate）。
// 目标：不靠肉眼看截图也能量化“有没有排坏”。
;(() => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const doc = document.documentElement
  const body = document.body

  const name = (el) => {
    if (!el) return null
    const parts = [el.tagName.toLowerCase()]
    if (el.id) parts.push('#' + el.id)
    const cls = (el.getAttribute('class') || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
    if (cls.length) parts.push('.' + cls.join('.'))
    return parts.join('')
  }

  const text = (el) => (el?.innerText || el?.textContent || '').trim().slice(0, 40)
  const rect = (el) => {
    const r = el.getBoundingClientRect()
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      right: Math.round(r.right),
      bottom: Math.round(r.bottom),
    }
  }
  const visible = (el) => {
    if (!el) return false
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) {
      return false
    }
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }

  // 元素是否被「视口内的横向滚动容器」包住——这种溢出是设计内的（如首页高价买取横条），
  // 不算页面横向溢出。必须沿整条祖先链找：最近的可裁剪祖先可能只是卡片自身的
  // overflow-hidden，真正兜住溢出的是更上层的 overflow-x-auto。
  const scrollContainerFor = (el) => {
    let p = el.parentElement
    while (p && p !== body) {
      const s = getComputedStyle(p)
      const scrollX = s.overflowX === 'auto' || s.overflowX === 'scroll'
      const scrollY = s.overflowY === 'auto' || s.overflowY === 'scroll'
      if (scrollX || scrollY) {
        const r = p.getBoundingClientRect()
        if (r.left >= -1 && r.right <= vw + 1) {
          return { by: name(p), rect: rect(p), axis: scrollX ? 'x' : 'y' }
        }
        return { by: name(p), rect: rect(p), axis: scrollX ? 'x' : 'y', outside: true }
      }
      p = p.parentElement
    }
    return null
  }

  const offenders = []
  const clipped = []
  for (const el of body.querySelectorAll('*')) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    const outLeft = r.left < -1
    const outRight = r.right > vw + 1
    if (!outLeft && !outRight) continue
    const clip = scrollContainerFor(el)
    const rec = { el: name(el), text: text(el), rect: rect(el), outLeft, outRight }
    if (clip && !clip.outside) {
      clipped.push({ ...rec, clip })
    } else {
      offenders.push({ ...rec, clip })
    }
  }

  // 文本被省略号截断的元素（信息丢失提示，不一定是 bug）
  const truncated = []
  for (const el of body.querySelectorAll('h1,h2,h3,p,span,div,a,button,label,dd,dt')) {
    if (!visible(el)) continue
    if (el.children.length > 1) continue
    const s = getComputedStyle(el)
    if (s.textOverflow !== 'ellipsis' && s.overflow !== 'hidden') continue
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      truncated.push({
        el: name(el),
        text: text(el),
        clientW: el.clientWidth,
        scrollW: el.scrollWidth,
      })
    }
  }

  // 交互元素尺寸（WCAG 2.5.8 最小 24×24；iOS 建议 44×44）
  const smallTargets = []
  const seen = new Set()
  for (const el of body.querySelectorAll('a,button,select,input,textarea,[role="button"]')) {
    if (!visible(el)) continue
    if (el.closest('[aria-hidden="true"]')) continue
    const r = el.getBoundingClientRect()
    if (r.width < 24 || r.height < 24) {
      const key = name(el) + text(el)
      if (seen.has(key)) continue
      seen.add(key)
      smallTargets.push({
        el: name(el),
        text: text(el) || el.getAttribute('aria-label') || el.getAttribute('placeholder'),
        w: Math.round(r.width),
        h: Math.round(r.height),
      })
    }
  }

  // 头部
  const header = document.querySelector('header')
  const headerNav = header?.querySelector('nav')
  const searchInput = header?.querySelector('input[name="q"]')
  const burger = header?.querySelector('button[aria-expanded]')
  const headerBox = header ? rect(header) : null
  const headerRow = header?.querySelector('.h-14')
  const headerControls = header
    ? [...header.querySelectorAll('a,button,select,input')]
        .filter(visible)
        .filter((el) => !el.closest('[class*="sm:hidden"]') || true)
        .map((el) => ({ el: name(el), text: text(el) || el.getAttribute('aria-label'), rect: rect(el) }))
    : []
  const headerOverlaps = []
  for (let i = 0; i < headerControls.length; i++) {
    for (let j = i + 1; j < headerControls.length; j++) {
      const a = headerControls[i]
      const b = headerControls[j]
      const ar = a.rect
      const br = b.rect
      const ix = Math.min(ar.x + ar.w, br.x + br.w) - Math.max(ar.x, br.x)
      const iy = Math.min(ar.y + ar.h, br.y + br.h) - Math.max(ar.y, br.y)
      if (ix > 1 && iy > 1) {
        headerOverlaps.push({ a: a.el, b: b.el, ix: Math.round(ix), iy: Math.round(iy) })
      }
    }
  }

  // 底部
  const footer = document.querySelector('footer')
  const footerLinks = footer
    ? [...footer.querySelectorAll('a')].filter(visible).map((a) => ({ text: text(a), rect: rect(a) }))
    : []
  const footerGrid = footer?.querySelector('.grid')

  const main = document.querySelector('main')

  // 溢出判定基准：优先用视觉视口（设备真实可见宽度）。移动端模拟下布局视口会被
  // 内容撑大，若用 clientWidth 相减永远得 0，会漏掉「整页被缩小」这类真问题。
  const baseWidth = Math.round(window.visualViewport?.width ?? vw)

  return {
    vw,
    vh,
    baseWidth,
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    viewportExpanded: doc.clientWidth - baseWidth,
    docOverflow: doc.scrollWidth - baseWidth,
    layoutOverflow: doc.scrollWidth - doc.clientWidth,
    bodyOverflow: body.scrollWidth - doc.clientWidth,
    pageHeight: doc.scrollHeight,
    offenders: offenders.slice(0, 25),
    clippedOverflow: clipped.slice(0, 15),
    truncated: truncated.slice(0, 25),
    smallTargets: smallTargets.slice(0, 25),
    header: header
      ? {
          rect: headerBox,
          position: getComputedStyle(header).position,
          row: headerRow ? rect(headerRow) : null,
          navVisible: visible(headerNav),
          searchVisible: visible(searchInput),
          searchRect: searchInput ? rect(searchInput) : null,
          burgerVisible: visible(burger),
          burgerRect: burger ? rect(burger) : null,
          localeSelect: (() => {
            const s = header.querySelector('select')
            return s && visible(s) ? rect(s) : null
          })(),
          controls: headerControls,
          overlaps: headerOverlaps,
        }
      : null,
    footer: footer
      ? {
          rect: rect(footer),
          linkCount: footerLinks.length,
          links: footerLinks,
          gridColumns: footerGrid ? getComputedStyle(footerGrid).gridTemplateColumns : null,
          firstRowItems: (() => {
            if (!footerGrid) return null
            const kids = [...footerGrid.children].filter(visible)
            if (!kids.length) return null
            const top = Math.round(kids[0].getBoundingClientRect().top)
            return kids.filter((k) => Math.abs(k.getBoundingClientRect().top - top) < 2).length
          })(),
        }
      : null,
    main: main ? { rect: rect(main) } : null,
    bodyText: body.innerText.slice(0, 200),
  }
})()
