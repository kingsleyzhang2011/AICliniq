# AGENTS.md — AICliniq
# 所有AI协作者必须在开始任何任务前读取本文件

## 项目简介
面向海外华人的云端家庭AI多医生会诊系统。
中英双语，To C个人用户为主，预留To B机构接口。

## 你的角色
你是本项目的开发协作者。在开始任务前，先完整阅读并确认以下项目约束。每次回复前，你必须在这个框架内工作，不得自行更改架构决策。

## 技术栈（锁定）
- **前端**：Vue 3    <title>AICliniq 医疗会诊面板</title>wind CSS (AICliniq)
- **数据库**：Supabase（已有账号）
- **部署**：Vercel（已有账号）
- **状态管理**：Pinia
- **图表**：Chart.js + vue-chartjs
- **国际化**：Vue i18n（中英双语）
- **PWA**：Vite PWA Plugin
- **AI 能力**：
  - 语音输入：Groq Whisper（主）/ 浏览器 Web Speech（备）
  - 语音输出：浏览器原生 SpeechSynthesis
  - OCR：Gemini Flash Vision（支持多页 PDF）

**绝对禁止**：引入任何需要付费的第三方服务、任何需要独立后端服务器的方案（全部走 Supabase + Vercel）、任何与上述架构冲突的新依赖。

## AI 调用架构（三轨，src/services/ai.js，锁定）
1. Gemini 2.5 Flash（默认主力）/ 2.5 Flash-Lite（护士轻量）
2. Groq + Llama（限速 429 或超时 503 时 fallback）
3. 硅基流动 Qwen2.5-7B（大陆备用，待机）
- 401/403 错误不 fallback，直接抛出
- 所有调用必须经过 `callWithFallback()`，禁止绕过

### 模型版本锁定（2026-03 更新）
- **Gemini**：`gemini-2.5-flash`（默认主力）、`gemini-2.5-flash-lite`（护士/轻量任务）
  - Gemini 2.0 Flash 已于 2026-02 废弃（退役 2026-06-01），禁止使用。
  - 如需 2.5 Pro，使用 `gemini-2.5-pro`。
- **Groq**：`llama-3.3-70b-versatile`
- **SiliconFlow**：`Qwen/Qwen2.5-7B-Instruct`
- **异常处理**：如遇模型 404/400 错误，必须先报告原因，**不得自行降级**。

## 数据库规则（Supabase）
- **核心表**：user_profiles / health_records / vitals_log / chat_sessions / reports / push_settings
- **字段要求**：所有表必须包含 `organization_id` 字段（DEFAULT NULL，预留 To B）
- **安全**：所有表启用 RLS
- **存储**：Storage Bucket `medical-files`（Private，通过 Signed URL 访问）
- **变更流程**：新增表或修改字段必须先列出变更说明，经用户确认后方可执行

## 代码规范
- **组件**：统一使用 Vue 3 Composition API (`<script setup>`)
- **命名**：组件 PascalCase，工具函数 camelCase
- **免责声明**：必须出现在所有 AI 回复展示处
  > 「本工具仅提供公开知识参考，绝非医疗诊断或处方。任何健康问题请立即咨询医生或急诊。」

## 工作规则
1. **专注任务**：每次只做指定任务，不顺便重构其他文件
2. **变更告知**：改动超过 3 个文件前，先列清单等待确认
3. **架构先导**：遇到架构分歧先沟通，不自行决定
4. **输出规范**：注明文件路径 + 操作类型（新建/修改）

## 确认格式
每次新对话开始，读完本文件后回复：
「AGENTS.md 已读。技术栈：Vue3+Supabase+Vercel。
  当前锁定服务：[列出AI服务]。等待任务。」

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
