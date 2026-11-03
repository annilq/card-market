// 浏览器端 Sentry 上报入口。
//
// 文件名特意不用 `.client.ts` 后缀：TanStack Start 的 import-protection 规则
// 禁止「仅客户端模块」（*.client.*）被同构代码（__root.tsx / directus.ts 在
// 服务端和浏览器都要跑）静态导入，会直接构建报错。因此这里用中性命名，
// 但内部用「动态 import + 环境守卫」保证浏览器 SDK 只在浏览器加载、绝不进 SSR 产物。
//
// 服务端（Node SSR / 进程级）的错误由 prod-server.mjs 里的 @sentry/node 负责，
// 与本文件互不影响。

let initialized = false

function dsn(): string | undefined {
  // VITE_ 前缀的变量由 Vite 在构建期注入浏览器端。
  return (import.meta.env.VITE_SENTRY_DSN as string | undefined) || undefined
}

/** 在浏览器端初始化 Sentry。重复调用安全（幂等）。 */
export function initClientSentry(): void {
  if (initialized || typeof window === 'undefined') return
  const clientDsn = dsn()
  if (!clientDsn) return
  initialized = true
  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: clientDsn,
      environment: (import.meta.env.MODE as string) || 'production',
      // 性能采样：默认 10%，可用 VITE_SENTRY_TRACES_SAMPLE_RATE 覆盖（与
      // 服务端 SENTRY_TRACES_SAMPLE_RATE 对应）。设为 0 可彻底关闭 tracing。
      tracesSampleRate: Number(
        import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1,
      ),
      // 浏览器 tracing 集成：自动采集「页面加载(pageload)」与「路由切换(navigation)」
      // 事务，并通过 fetch/xhr 自动插桩。前端经同源请求打到 SSR、SSR 再抓取
      // Directus 时，sentry-trace / baggage 头会沿链路传递，浏览器 → SSR → Directus
      // 被串联成同一条分布式 trace（跨域时需在 tracingOrigins 里显式放行）。
      integrations: [Sentry.browserTracingIntegration()],
      // 会话回放：仅在发生错误时录一小段，便于还原白屏/交互卡死现场。
      replaysOnErrorSampleRate: 1.0,
    })
  })
}

/**
 * 上报一个错误到 Sentry（仅浏览器端生效；SSR 阶段是 no-op）。
 * 用于把「被业务代码吞掉、但值得记录」的客户端错误（如表单提交失败、
 * fetch 失败）显式上报，而不依赖全局 window.onerror。
 */
export function reportError(error: unknown): void {
  if (typeof window === 'undefined') return
  const clientDsn = dsn()
  if (!clientDsn) return
  void import('@sentry/react')
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {
      /* 上报失败不应影响主流程 */
    })
}

// 模块被 import 即尝试初始化（仅浏览器）。
// __root.tsx / directus.ts 通过 `import { reportError } from '~/lib/sentry'` 触发本模块执行。
if (typeof window !== 'undefined') initClientSentry()
