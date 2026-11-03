// 生产服务器适配器：加载 TanStack Start 构建产物（dist/server/server.js），
// 其默认导出为 { fetch: (Request) => Promise<Response> }（Web 标准接口）。
// 本适配器在 Node http 与 Web 接口之间桥接并监听端口。
// 同时负责托管构建出的静态资源（dist/client 下的 /assets/* 等），
// 否则客户端 JS/CSS 会 404 → 页面无法水合 → 客户端交互（筛选、路由跳转）全部失效。
// 用法：npm run build && npm start
import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import server_default from './dist/server/server.js'

// —— 错误上报（Sentry，可选）——
// 仅当配置了 SENTRY_DSN 才初始化；不配置则完全不启用，行为与之前一致。
// 用 `@sentry/node`：本文件是纯 Node 入口，不经 Vite 打包，
// 因此不会把 Node SDK 带进浏览器包。
import {
  init as sentryInit,
  captureException as sentryCapture,
  flush as sentryFlush,
  continueTrace,
} from '@sentry/node'

const SENTRY_DSN = process.env.SENTRY_DSN
if (SENTRY_DSN) {
  sentryInit({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  })
}

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const CLIENT_DIR = join(ROOT, 'dist', 'client')
const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
}

// 健康检查端点：供反代 / 外部探活（UptimeRobot、容器 healthcheck）打。
// 只报告「进程还活着」，不直接打数据库（避免探活流量把 DB 打挂）。
function tryHealthz(req, res) {
  let pathname
  try {
    pathname = new URL(req.url, `http://${req.headers.host}`).pathname
  } catch {
    return false
  }
  if (pathname !== '/healthz') return false
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(
    JSON.stringify({
      ok: true,
      uptime: Math.round(process.uptime()),
      rssMb: Math.round(process.memoryUsage().rss / 1048576),
      ts: new Date().toISOString(),
    }),
  )
  return true
}

// 尝试以静态文件响应；返回 true 表示已处理（含 404），调用方无需再走 SSR。
function tryServeStatic(req, res) {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname)
  } catch {
    return false
  }
  if (pathname.endsWith('/')) pathname += 'index.html'
  const filePath = normalize(join(CLIENT_DIR, pathname))
  // 防目录穿越：解析后必须仍在 CLIENT_DIR 之内
  if (filePath !== CLIENT_DIR && !filePath.startsWith(CLIENT_DIR + '/')) {
    res.writeHead(403)
    res.end('Forbidden')
    return true
  }
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath).toLowerCase()
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    })
    if (req.method === 'HEAD') {
      res.end()
    } else {
      createReadStream(filePath).pipe(res)
    }
    return true
  }
  return false
}

const webHandler = server_default?.fetch
if (typeof webHandler !== 'function') {
  console.error('❌ 无法从 dist/server/server.js 读取 fetch 处理器')
  process.exit(1)
}

const server = createServer(async (req, res) => {
  try {
    // 探活优先于静态/SSR：healthcheck 不应被当成普通请求走一遍渲染。
    if (req.method === 'GET' && tryHealthz(req, res)) return

    if ((req.method === 'GET' || req.method === 'HEAD') && tryServeStatic(req, res)) {
      return
    }

    const url = `http://${req.headers.host || 'localhost'}${req.url}`
    const body =
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : Readable.toWeb(req)

    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body,
      duplex: body ? 'half' : undefined,
    })

    // 继续浏览器传来的 trace：从 sentry-trace / baggage 头还原父 span，
    // 让「浏览器 navigation/pageload → SSR → Directus」串成同一条分布式 trace。
    // 没有这些头（如直接 curl、健康检查）时回调照常执行，不影响正常请求。
    const response = await continueTrace(
      {
        sentryTrace: req.headers['sentry-trace'],
        baggage: req.headers['baggage'],
      },
      async () => {
        return await webHandler(request)
      },
    )

    res.statusCode = response.status
    response.headers.forEach((value, key) => res.setHeader(key, value))
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res)
    } else {
      res.end()
    }
  } catch (err) {
    console.error('请求处理出错：', err)
    if (SENTRY_DSN) sentryCapture(err)
    if (!res.headersSent) res.writeHead(500)
    res.end('Internal Server Error')
  }
})

server.listen(PORT, HOST, () => {
  console.log(`✓ 生产服务器已启动：http://localhost:${PORT}（静态资源来自 dist/client）`)
})

server.on('error', (err) => {
  console.error('❌ 服务器错误：', err)
  if (SENTRY_DSN) sentryCapture(err)
})

// —— 进程级诊断：静默退出时能看出是哪个信号/异常导致的 ——
for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGQUIT']) {
  process.on(sig, async () => {
    console.error(`⚠️ 收到信号 ${sig}，进程即将退出（时间 ${new Date().toISOString()}）`)
    // 退出前把缓冲中的 Sentry 事件发出去，避免丢最后一批报错。
    if (SENTRY_DSN) await sentryFlush(2000).catch(() => {})
    process.exit(128 + (sig === 'SIGINT' ? 2 : sig === 'SIGHUP' ? 1 : 15))
  })
}

process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获异常：', err)
  if (SENTRY_DSN) sentryCapture(err)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ 未处理的 Promise 拒绝：', reason)
  if (SENTRY_DSN) sentryCapture(reason)
})

process.on('exit', (code) => {
  console.error(`⚠️ 进程退出，code=${code}（时间 ${new Date().toISOString()}）`)
})

// 定时心跳日志：便于区分「进程还活着」与「进程静默消失」
const heartbeatMinutes = Number(process.env.HEARTBEAT_MINUTES || 0)
if (heartbeatMinutes > 0) {
  setInterval(
    () => console.log(`· 心跳 ${new Date().toISOString()} rss=${Math.round(process.memoryUsage().rss / 1048576)}MB`),
    heartbeatMinutes * 60_000,
  ).unref()
}
