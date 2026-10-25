# 图片存储与 Directus 的集成方案

Type: research
Status: resolved
Blocked by:

## Question

图片统一存对象存储，后台经 Directus 上传与管理。原方案评估阿里云 OSS，但项目部署在日本、美国等海外区域，需重新确定存储方案：Directus 存储驱动如何对接？是否仍用国内 OSS？多区域访问如何优化？

## Answer

**决策：弃用阿里云 OSS，改用以下两条路线之一（按规模二选一）：**

- **路线 A（推荐，生产）**：海外 S3 兼容对象存储。Directus `s3` 存储驱动原生对接，海外区域**无国内那种兼容坑**（无需 `FORCE_PATH_STYLE`）。多区域（JP/US）建议：
  - **Cloudflare R2**：S3 兼容、全球边缘缓存、无出口流量费，单一桶即可服务 JP/US，双区域内容站首选。
  - **AWS S3 + CloudFront**：S3 落最近区域（ap-northeast-1 东京 / us-east-1），CloudFront 做全球 CDN。
  - **DigitalOcean Spaces**（自带 CDN）/ **Wasabi** / **Backblaze B2**（便宜、无出口费）。
- **路线 B（最简，MVP / 单服务器）**：Directus 内置 `local` 文件驱动，图片存服务器持久卷。零外部依赖、零额外账单，最贴合"Directus 自带文件管理"；多实例横向扩展时需共享存储（NFS/托管卷），届时转路线 A。

**关键结论：**

- 不再受国内 OSS 的 2025-03 外网域名约束影响（该约束仅针对中国大陆新 bucket）。
- 多区域访问靠 CDN / 边缘缓存（R2 全球边缘 或 S3+CloudFront），避免跨洋回源慢。
- 凭证仅在 Directus 服务端 env，**绝不**进入前端；公开读 + 自定义域 / CDN + HTTPS。
- 具体 env 配置与示例见 `docs/development.md` 第 5 节。

**剩余小决策（部署时定）**：路线 A 与路线 B 的最终取舍，以及若选 A 选哪家（R2 还是 S3+CloudFront），可在 [部署环境与技术栈落定](09-deployment.md) 落地时一并确定。
