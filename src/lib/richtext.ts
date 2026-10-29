// 富文本统一渲染（数据边界处解析一次，页面组件只认 HTML 字符串）。
//
// Directus 的 body 字段实际混着两种格式：
//  - 种子 / 历史数据：直接存 HTML（如 <p>…</p>，见 directus/seed.mjs）
//  - 后台 Markdown 编辑器（input-rich-text-md，见 directus/bootstrap.mjs:381/478）产出：Markdown 源码
// 过去两个路由都把 body 直接 dangerouslySetInnerHTML，于是 Markdown 语法（#、**、-）原样显示成文字。
//
// 这里在边界归一：无论来源是 HTML 还是 Markdown，都先用 markdown-it 转成 HTML（html:true 让内嵌 HTML 也保留），
// 再统一过 DOMPurify 清洗（去掉 <script>、on* 事件属性、javascript: 链接）。
// 来源是受信任的管理员内容，但仍做防御式清洗，避免一次误配置就把脚本注入全站。
//
// 坑：CommonMark 规定，文档若以块级 HTML 标签（如 <p>）开头，会开启一个 HTML 块，
// 一直吞掉后续所有行（直到空行）。所以「HTML 片段 + 后面跟 Markdown」的混合内容里，
// 后面的 Markdown（比如 ![图片]()）不会被解析，原样显示。normalizeHtmlMarkdown 在 HTML→Markdown 的边界补一个空行，
// 让 markdown-it 能切回 Markdown 解析；同时不破坏嵌套 HTML（缩进的 HTML 内容不插空行）。
import MarkdownIt from 'markdown-it'
import DOMPurify from 'isomorphic-dompurify'

const md = new MarkdownIt({
  html: true, // 允许 Markdown 里内嵌的 HTML 保留，最终由 DOMPurify 把关，而非在此转义
  linkify: true, // 自动把裸 URL 转成链接
  breaks: false,
  typographer: true,
})

// 块级 HTML 标签（注意：不含 b/i/strong/em/a/img/span/code 等行内标签）
// 用于判断「某一行是否以一个块级 HTML 标签开头」—— 行内 HTML（如 `文字 <strong>x</strong>`）不以 < 开头，不会被命中。
const BLOCK_TAG_LINE =
  /^\s*<\/?(?:p|div|h[1-6]|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|blockquote|pre|hr|section|article|header|footer|nav|main|figure|figcaption|aside|address|dl|dt|dd|fieldset|legend)(?:\s[^>]*)?>/

// 在「块级 HTML 标签行」与后面的非 HTML（Markdown）内容之间补一个空行，
// 让 markdown-it 不要把后续 Markdown 整个吞进 HTML 块。缩进的 HTML 内容视为嵌套 HTML，保持原样（避免拆散嵌套结构）。
function normalizeHtmlMarkdown(src: string): string {
  const lines = src.split(/\r?\n/)
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i])
    const next = lines[i + 1]
    if (
      BLOCK_TAG_LINE.test(lines[i]) &&
      next !== undefined &&
      next.trim() !== '' &&
      !BLOCK_TAG_LINE.test(next) &&
      !/^\s+</.test(next) // 下一行是缩进的 HTML 内容，保持原样（避免拆散嵌套 HTML）
    ) {
      out.push('')
    }
  }
  return out.join('\n')
}

/**
 * 把 Directus 的 body（HTML 或 Markdown，或两者混合）渲染成安全 HTML 字符串。
 * 空内容返回 ''，调用方用它做「是否渲染正文块」的判断即可。
 */
export function renderRichText(src: string | null | undefined): string {
  if (!src || !src.trim()) return ''
  return DOMPurify.sanitize(md.render(normalizeHtmlMarkdown(src)))
}
