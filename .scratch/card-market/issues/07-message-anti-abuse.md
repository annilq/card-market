# 留言防滥用策略

Type: grilling
Status: resolved
Blocked by: (无；01/02/05/06 已决议)

## Decision（收敛结论）

经 grill，留言防滥用采用**弱防护、零自定义后端**方案，与 `docs/development.md` §1「前端只与 Directus 通信」架构保持一致：

1. **提交链路：直连 Directus Public create**（`POST /items/messages`，仅允许写入 `content`/`contact_name`/`contact_info` 字段）。不引入自定义服务端网关（TanStack Start server action 等）。
2. **防滥用手段（仅限直连可实现的）**：
   - **边缘限流**：Cloudflare / Nginx WAF 速率规则（部署层、不写代码），挂 ticket [09-deployment](../.scratch/card-market/issues/09-deployment.md) 定阈值。
   - **字段校验**：Directus 字段级必填 / 长度，原生支持。
   - **不采用** 图形 / 行为验证码、IP 频率限制、内容审核（关键词 / 链接检测）—— 三者均需服务端网关，与「直连 Directus、零后端」冲突，本期不做。
   - **不采用** 蜜罐字段（用户选择，仅靠边缘限流 + 字段校验）。
3. **通知：仅站内** —— 管理员登录 Directus 后台看到 `status=新` 的留言即可；不做邮件通知（避免引入 SMTP + Flows 依赖，亦不挂 09 部署）。
4. **联系方式：可选** —— `contact_name` / `contact_info` 均选填，降低提交门槛；无法留联系方式的留言仅作单向反馈，管理员可能无法回复。
5. **垃圾留言去处：新增 `已标记垃圾` 状态** —— 由管理员在后台**手动**判定（无自动检测，因未采用蜜罐 / 内容审核），与 `已归档` 区分，可批量清理。

## 数据模型（`messages`，见 development.md §4.5）

| 字段 | 类型 | 说明 | 必填 |
| --- | --- | --- | --- |
| id | PK |  | — |
| content | text | 留言内容 | 始终（必填） |
| contact_name | string | 联系人（选填，降门槛） | 可选 |
| contact_info | string | 联系方式（邮箱/电话/微信，选填） | 可选 |
| created_at | timestamp | 提交时间 | 自动 |
| status | enum | **新 / 已处理 / 已归档 / 已标记垃圾** | — |

> **为何 `messages` 不用 Directus 内置 status**：留言不是发布内容、无 `published` 语义；其生命周期是工单式处理流（新→已处理 / 已归档 / 已标记垃圾），自定义枚举更贴切。此点与 cards / banners / announcements 统一用 Directus 内置 status 的取向**有意不同**，非疏漏。

## 权限（见 development.md §4.8）

- Public 角色：仅可**创建** `messages` 的 `content` / `contact_name` / `contact_info` 字段；**关闭公开读取**。
- Admin 角色：读取全部、可改 `status`（处理 / 归档 / 标记垃圾）。

## 反转的旧假设

- 原 07 把「验证码 / 频率限制 / 内容审核」列为同等待选项 —— 实际三者都依赖自定义网关，与「直连 Directus、零后端」冲突；本期仅取边缘限流 + 字段校验。
- 原 `messages.status` 枚举未含垃圾态 —— 补 `已标记垃圾`（管理员手动判定）。
- 原「邮件通知」假设被否，改为仅站内（Directus 后台可见）。
- 原「联系方式必填 / 至少留一种」假设被否，改为全可选。
- 原「是否要求登录」默认建议不要求 —— 维持**不要求登录**（与弱防护、降门槛一致）。

## 次要开放项（实现期定，不阻塞）

1. 边缘限流具体阈值（单 IP 1 分钟 N 次）在 09 部署时定。
2. 是否需要保留期 / 定期清理策略（隐私合规，关联 `site_settings.privacy_policy`）—— 建议管理员定期清理 `已标记垃圾`。
3. `contact_info` 是否做格式校验（邮箱 / 电话 / 微信）—— 仅前端体验项，不影响模型。
