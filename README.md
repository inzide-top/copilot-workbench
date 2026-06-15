# AI 求职/面试 Copilot 工作台

一个偏 B 端的 AI 求职工作台，用来维护简历和项目经历、分析 JD、生成定制面试话术、模拟面试官追问、评分回答，并管理投递进展。

## 功能

- 简历和项目经历维护，支持粘贴文本，导入 `.txt/.md/.docx/.pdf` 和图片 OCR
- JD 匹配分析：匹配度、关键词、缺口、优势和补强建议
- JD 截图/文件导入，自动 OCR/解析并在缺少公司名时提示
- 定制材料生成：自我介绍、简历 bullet、项目话术、风险追问准备
- AI 模拟面试官：服务端流式输出
- 回答评分：结构、技术深度、业务影响、风险意识
- 投递看板：公司、岗位、状态、下一步、复盘记录
- Prisma + PostgreSQL/Supabase 数据模型，预留 embedding 字段方便后续接 pgvector

## 本地启动

```bash
npm run dev
```

打开 `http://localhost:3000`。

没有配置数据库和模型 key 时，应用仍可演示：浏览器 localStorage 会保存工作台数据，AI 相关接口会返回本地启发式结果。

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写：

```bash
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="..."
OPENAI_BASE_URL=""
OPENAI_MODEL="gpt-4o-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
```

配置 Supabase/Postgres 后执行：

```bash
npm run prisma:generate
npm run prisma:push
```

## 技术栈

- Next.js App Router + React + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL/Supabase
- OpenAI 兼容 Chat Completions API
- Mammoth / PDF.js / Tesseract.js 文档与图片识别
