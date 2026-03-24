# LifeGuard AI — 云端家庭AI多医生会诊系统

面向海外华人的云端家庭AI多医生会诊系统。中英双语，To C个人用户为主，预留To B机构接口。

## 📖 项目简介

LifeGuard AI 是一个基于 Vue 3 + Pinia + Supabase 开发的创新医疗会诊模拟系统。它通过集成多个大语言模型（LLM）扮演不同的医生角色，实现多专家协同诊断，旨在为海外华人提供便捷的家庭健康辅助决策支持。

### ✨ 核心特性

- 🏥 **多医生协作**：支持添加多个由不同 LLM 驱动的医生参与会诊
- 🤖 **四轨 AI 架构**：内置 Gemini (主力) / Groq / 硅基流动 fallback 机制
- 💬 **实时讨论**：医生轮换发言，模拟真实医疗会诊场景
- 🗳️ **智能评估**：基于同行评审机制，医生互相评估彼此的诊断以提高准确性
- 📊 **状态监控**：实时展示会诊阶段、发言轮次与医生当前状态
- ☁️ **云端存储**：使用 Supabase 实现用户信息、健康记录与报告的高效管理
- 📱 **PWA 支持**：支持安装至桌面或移动端主屏幕，离线能力增强

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/kingsleyzhang2011/lifeguard-ai.git
cd lifeguard-ai
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

- **前端**：Vue 3 + Vite + Tailwind CSS
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
