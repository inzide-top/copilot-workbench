import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  Gauge,
  MessageSquareText,
  Settings,
  Sparkles,
} from "lucide-react";
import type { ComponentType } from "react";
import type {
  AiConfigDraft,
  ApplicationPriority,
  ApplicationRegion,
  ApplicationStatus,
  InterviewMessageDraft,
  ProfileDraft,
} from "@/lib/types";
import type { Section } from "./workbench-types";

export const defaultProfile: ProfileDraft = {
  name: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  summary: "",
  resumeText: "",
};

export const defaultAiConfig: AiConfigDraft = {
  provider: "openai",
  apiKey: "",
  baseUrl: "",
  model: "gpt-4o-mini",
};

export const aiProviderOptions = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    description: "官方 OpenAI 接口，Base URL 留空即可。",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    models: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
    description: "DeepSeek OpenAI 兼容接口，适合中文、代码和成本敏感场景。",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    models: ["gemini-3.5-flash", "gemini-3.5-pro", "gemini-2.5-flash", "gemini-2.5-pro"],
    description: "Google Gemini 的 OpenAI 兼容接口。",
  },
  {
    id: "qwen",
    label: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-plus", "qwen-max", "qwen-turbo", "qwen-long"],
    description: "阿里云 DashScope 兼容模式。",
  },
  {
    id: "kimi",
    label: "Kimi / Moonshot",
    baseUrl: "https://api.moonshot.ai/v1",
    models: ["kimi-k2.6", "kimi-k2.6-thinking", "moonshot-v1-8k", "moonshot-v1-32k"],
    description: "Kimi OpenAI 兼容接口，适合中文长文本场景。",
  },
  {
    id: "zhipu",
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-flash", "glm-4-plus", "glm-4-air", "glm-4-long"],
    description: "智谱 BigModel OpenAI 兼容接口。",
  },
  {
    id: "baichuan",
    label: "百川智能",
    baseUrl: "https://api.baichuan-ai.com/v1",
    models: ["Baichuan4", "Baichuan3-Turbo", "Baichuan3-Turbo-128k"],
    description: "百川 OpenAI 兼容接口。",
  },
  {
    id: "siliconflow",
    label: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    models: ["deepseek-ai/DeepSeek-V3", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen2.5-72B-Instruct"],
    description: "硅基流动 OpenAI 兼容接口，可接入多个开源和国产模型。",
  },
  {
    id: "volcengine",
    label: "火山方舟",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: ["填写你的方舟模型 Endpoint ID", "deepseek-v3", "deepseek-r1"],
    description: "火山方舟 OpenAI 兼容接口，模型名通常填写控制台里的 Endpoint ID。",
  },
  {
    id: "ollama",
    label: "本地 Ollama",
    baseUrl: "http://localhost:11434/v1",
    models: ["qwen2.5", "llama3.1", "deepseek-r1", "mistral"],
    description: "本地模型服务。Next.js 服务端需要能访问你的 Ollama 端口。",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-4o-mini", "google/gemini-flash-1.5", "deepseek/deepseek-chat", "anthropic/claude-sonnet-4"],
    description: "统一模型聚合入口，可间接使用 Claude、Gemini、DeepSeek 等模型。",
  },
  {
    id: "custom",
    label: "自定义兼容接口",
    baseUrl: "",
    models: ["custom-model"],
    description: "适合硅基流动、火山方舟、本地 Ollama、公司内网模型等 OpenAI 兼容服务。",
  },
] satisfies Array<{
  id: string;
  label: string;
  baseUrl: string;
  models: string[];
  description: string;
}>;

export const navItems: Array<{ id: Section; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "总览", icon: BarChart3 },
  { id: "profile", label: "简历项目", icon: FileText },
  { id: "jd", label: "JD 分析", icon: Gauge },
  { id: "pitch", label: "定制话术", icon: Sparkles },
  { id: "interview", label: "模拟面试", icon: MessageSquareText },
  { id: "applications", label: "投递看板", icon: BriefcaseBusiness },
  { id: "settings", label: "模型配置", icon: Settings },
];

export const statusLabels: Record<ApplicationStatus, string> = {
  SAVED: "待投递",
  APPLIED: "已投递",
  INTERVIEWING: "面试中",
  OFFER: "Offer",
  REJECTED: "未通过",
  ARCHIVED: "归档",
};

export const industryOptions = [
  "互联网/软件",
  "人工智能/数据",
  "电子商务/本地生活",
  "金融/证券/保险",
  "教育/培训",
  "医疗健康/生物医药",
  "智能硬件/半导体",
  "企业服务/咨询",
  "先进制造/工业",
  "游戏/文娱/内容",
  "消费/零售",
  "房地产/建筑",
  "能源/汽车/物流",
  "政府/事业单位",
  "其他",
];

export const priorityOptions: ApplicationPriority[] = ["S", "A", "B", "C", "D"];
export const regionOptions: ApplicationRegion[] = ["华东", "华南", "华北", "华中", "西南"];
export const interviewRoundTemplates = ["一面", "二面", "三面", "HR 面"];

export const priorityTone: Record<ApplicationPriority, string> = {
  S: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  A: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  B: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  C: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  D: "border-muted bg-muted text-muted-foreground",
};

export const storageKey = "interview-copilot-workbench-v1";
export const aiConfigStorageKey = "interview-copilot-ai-config-v1";
export const defaultResumeId = "resume-default";
export const demoResumePath = "/examples/sample-resume.pdf";
export const demoJdPath = "/examples/sample-jd.png";

export const demoAiConfig: AiConfigDraft = {
  provider: "deepseek",
  apiKey: "",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-v4-pro",
};

export const starterInterviewMessage: InterviewMessageDraft = {
  id: "starter-intro",
  role: "assistant",
  content: "我们开始模拟面试。请先做一个 1 分钟自我介绍，重点说明你的求职方向、核心项目和你最想让面试官记住的能力。",
};
