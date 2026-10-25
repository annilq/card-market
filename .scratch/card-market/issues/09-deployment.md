# 部署环境与技术栈落定

Type: task
Status: open
Blocked by:

## Question

项目部署区域已明确为**日本、美国**（海外）。`spec.md` 的部署环境"根据项目实际情况确定"。上线前必须落定的事项：

1. 托管方式：单 VPS(Docker: Directus+Postgres+前端) / 海外云拆分(海外 VPS + 托管 PostgreSQL + 对象存储) / 托管 PaaS(Render/Fly + Vercel/Netlify)。需考虑 JP/US 双区域或就近单区域。
2. 域名与 HTTPS（含所选对象存储的自定义域名 CNAME 或 R2 自定义域，见 [图片存储与 Directus 的集成方案](04-oss-integration.md)）。
3. Directus 与 TanStack Start 前端的各自运行方式与反向代理（Nginx/Caddy）。
4. PostgreSQL 托管与备份策略（可随区域选托管库）。
5. 图片/静态资源 CDN 策略（R2 全球边缘 或 S3+CloudFront）以覆盖 JP/US。
6. 监控、日志与基本告警。

这是 frontier 上必须完成的落地基石之一；完成后方可进入正式部署与验收。
