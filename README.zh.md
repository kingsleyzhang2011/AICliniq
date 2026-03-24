# AGENTS.md — AICliniq 多智能体协助系统

AICliniq 是一款专注于高精度健康咨询的 AI 会诊系统。它通过 **Multi-Agent Consensus（多智能体共识）** 架构，模拟专业临床环境，由多位 AI 专家协作提供多维度的健康分析。

## ✨ 核心特性

- 🏥 **多医生协作**：采用“首席医师 + 专家辩论”模式，多维度评估病情。
- 🤖 **四轨 AI 架构**：内置 Gemini (主力) / Groq / 硅基流动 fallback 机制。
- 📚 **医疗 RAG**：集成权威医学知识库（如 MedlinePlus），确保建议有据可循。
- ☁️ **云端存储**：基于 Supabase 实现极速、安全的健康数据管理。
- 📱 **PWA 支持**：支持安装至桌面或移动端，随时随地开启会诊。

## 🚀 快速开始

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/kingsleyzhang2011/AICliniq.git
cd AICliniq
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
复制 `.env.example` 为 `.env.local` 并配置真实的 Key：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_KEY`
- ...

4. **启动开发服务器**
```bash
npm run dev
```

## 🛠️ 技术栈

- **前端**：Vue 3 + Vite + Tailwind CSS (AICliniq)base
- **数据库**：Supabase
- **状态管理**：Pinia
- **AI 架构**：Gemini 2.5 Flash, Groq, 硅基流动
- **图表**：Chart.js + vue-chartjs
- **国际化**：Vue i18n
- **PWA**：Vite PWA Plugin

## ⚖️ 免责声明

> 「本工具仅提供公开知识参考，绝非医疗诊断或处方。任何健康问题请立即咨询医生或急诊。」

## 📄 开源项目

MIT
