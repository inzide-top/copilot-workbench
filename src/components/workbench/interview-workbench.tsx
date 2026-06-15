"use client";

import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  FileText,
  Gauge,
  Layers3,
  Loader2,
  MessageSquareText,
  Plus,
  Save,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { extractTextFromFile, getSupportedImportAccept } from "@/lib/document-import";
import { parseJdFallback } from "@/lib/import-parsers";
import type {
  ApplicationDraft,
  ApplicationPriority,
  ApplicationRegion,
  ApplicationStatus,
  InterviewConversationScoreCache,
  InterviewRoundDraft,
  InterviewMessageDraft,
  InterviewScore,
  JdAnalysis,
  JobDescriptionDraft,
  AiConfigDraft,
  PitchOutput,
  ProfileDraft,
  ProjectDraft,
  ResumeDraft,
  WorkspaceSnapshot,
} from "@/lib/types";

type Section = "overview" | "profile" | "jd" | "pitch" | "interview" | "applications" | "settings";

type ResumeImportFields = Partial<ProfileDraft> & {
  projects?: ProjectDraft[];
};

type JdImportFields = {
  company: string;
  role: string;
  rawText: string;
  companyMissing: boolean;
};

const defaultProfile: ProfileDraft = {
  name: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  summary: "",
  resumeText: "",
};

const defaultAiConfig: AiConfigDraft = {
  provider: "openai",
  apiKey: "",
  baseUrl: "",
  model: "gpt-4o-mini",
};

const aiProviderOptions = [
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

const navItems: Array<{ id: Section; label: string; icon: typeof BarChart3 }> = [
  { id: "overview", label: "总览", icon: BarChart3 },
  { id: "profile", label: "简历项目", icon: FileText },
  { id: "jd", label: "JD 分析", icon: Gauge },
  { id: "pitch", label: "定制话术", icon: Sparkles },
  { id: "interview", label: "模拟面试", icon: MessageSquareText },
  { id: "applications", label: "投递看板", icon: BriefcaseBusiness },
  { id: "settings", label: "模型配置", icon: Settings },
];

const statusLabels: Record<ApplicationStatus, string> = {
  SAVED: "待投递",
  APPLIED: "已投递",
  INTERVIEWING: "面试中",
  OFFER: "Offer",
  REJECTED: "未通过",
  ARCHIVED: "归档",
};

const industryOptions = [
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

const priorityOptions: ApplicationPriority[] = ["S", "A", "B", "C", "D"];
const regionOptions: ApplicationRegion[] = ["华东", "华南", "华北", "华中", "西南"];
const interviewRoundTemplates = ["一面", "二面", "三面", "HR 面"];

const priorityTone: Record<ApplicationPriority, string> = {
  S: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  A: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  B: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  C: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  D: "border-muted bg-muted text-muted-foreground",
};

const storageKey = "interview-copilot-workbench-v1";
const aiConfigStorageKey = "interview-copilot-ai-config-v1";
const defaultResumeId = "resume-default";
const demoResumePath = "/examples/sample-resume.pdf";
const demoJdPath = "/examples/sample-jd.png";
const demoAiConfig: AiConfigDraft = {
  provider: "deepseek",
  apiKey: "",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-v4-pro",
};
const starterInterviewMessage: InterviewMessageDraft = {
  id: "starter-intro",
  role: "assistant",
  content: "我们开始模拟面试。请先做一个 1 分钟自我介绍，重点说明你的求职方向、核心项目和你最想让面试官记住的能力。",
};

function metricTone(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 65) return "text-amber-300";
  return "text-rose-300";
}

function emptyProject(): ProjectDraft {
  return {
    id: crypto.randomUUID(),
    title: "",
    role: "",
    stack: "",
    challenge: "",
    actions: "",
    impact: "",
    talkingPoints: "",
  };
}

function createResume(params?: {
  title?: string;
  targetRole?: string;
  profile?: ProfileDraft;
  projects?: ProjectDraft[];
}): ResumeDraft {
  const now = new Date().toISOString();
  const profile = params?.profile ?? defaultProfile;
  return {
    id: crypto.randomUUID(),
    title: params?.title || profile.headline || "未命名简历",
    targetRole: params?.targetRole || profile.headline || "",
    profile,
    projects: params?.projects ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

function defaultResume(): ResumeDraft {
  const now = new Date().toISOString();
  return {
    id: defaultResumeId,
    title: "默认简历",
    targetRole: "",
    profile: defaultProfile,
    projects: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeResume(resume: Partial<ResumeDraft>, fallback?: Partial<WorkspaceSnapshot>): ResumeDraft {
  const now = new Date().toISOString();
  const profile = { ...defaultProfile, ...(resume.profile ?? fallback?.profile) };
  return {
    id: resume.id || crypto.randomUUID(),
    title: resume.title || profile.headline || "未命名简历",
    targetRole: resume.targetRole || profile.headline || "",
    profile,
    projects: resume.projects?.length ? resume.projects : fallback?.projects?.length ? fallback.projects : [],
    createdAt: resume.createdAt || now,
    updatedAt: resume.updatedAt || now,
  };
}

function defaultInterviewRounds(): InterviewRoundDraft[] {
  return interviewRoundTemplates.slice(0, 1).map((name) => ({
    id: crypto.randomUUID(),
    name,
    status: "TODO",
    scheduledAt: "",
    notes: "",
  }));
}

function newApplication(): ApplicationDraft {
  return {
    id: crypto.randomUUID(),
    company: "",
    role: "",
    jdId: "",
    jdTitle: "",
    industry: "",
    priority: "B",
    region: "",
    city: "",
    status: "SAVED",
    notes: "",
    retrospective: "",
    statusReviews: {},
    interviewRounds: defaultInterviewRounds(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeApplication(application: Partial<ApplicationDraft>): ApplicationDraft {
  return {
    ...newApplication(),
    ...application,
    jdId: application.jdId ?? "",
    jdTitle: application.jdTitle ?? "",
    industry: application.industry ?? "",
    priority: application.priority ?? "B",
    region: application.region ?? "",
    city: application.city ?? "",
    notes: application.notes ?? "",
    retrospective: application.retrospective ?? "",
    statusReviews: application.statusReviews ?? {},
    interviewRounds: application.interviewRounds?.length ? application.interviewRounds : defaultInterviewRounds(),
    updatedAt: application.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeJobDescription(jd: Partial<JobDescriptionDraft>): JobDescriptionDraft {
  return {
    id: jd.id || crypto.randomUUID(),
    company: jd.company || "目标公司",
    role: jd.role || "目标岗位",
    rawText: jd.rawText || "",
    resumeId: jd.resumeId || "",
    resumeTitle: jd.resumeTitle || "",
    analysis: jd.analysis,
    analysisStatus: jd.analysisStatus || (jd.analysis ? "DONE" : undefined),
    pitch: jd.pitch,
    pitchStatus: jd.pitchStatus,
    pitchUpdatedAt: jd.pitchUpdatedAt || "",
    interview: jd.interview,
    createdAt: jd.createdAt || new Date().toISOString(),
  };
}

function snapshotHasData(snapshot: WorkspaceSnapshot | null | undefined) {
  return Boolean(
    snapshot &&
      ((snapshot.resumes?.length ?? 0) > 0 ||
        (snapshot.jobDescriptions?.length ?? 0) > 0 ||
        (snapshot.applications?.length ?? 0) > 0),
  );
}

function latestJd(jobDescriptions: JobDescriptionDraft[]) {
  return jobDescriptions[0];
}

async function parseImportedText<T>(kind: "resume" | "jd", text: string, aiConfig: AiConfigDraft) {
  const response = await fetch("/api/import/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, text, aiConfig }),
  });

  if (!response.ok) {
    throw new Error("文本识别成功，但结构化解析失败。");
  }

  return (await response.json()) as T;
}

async function loadPublicExampleFile(path: string, fileName: string, fallbackType: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error("示例文件加载失败，请稍后重试。");
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || fallbackType });
}

export function InterviewWorkbench() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [resumes, setResumes] = useState<ResumeDraft[]>([defaultResume()]);
  const [activeResumeId, setActiveResumeId] = useState(defaultResumeId);
  const [selectedJdResumeId, setSelectedJdResumeId] = useState(defaultResumeId);
  const [pendingImportedProjects, setPendingImportedProjects] = useState<ProjectDraft[]>([]);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescriptionDraft[]>([]);
  const [applications, setApplications] = useState<ApplicationDraft[]>([]);
  const [draftProject, setDraftProject] = useState<ProjectDraft>(emptyProject);
  const [jdDraft, setJdDraft] = useState({ company: "", role: "", rawText: "" });
  const [pitchDetailJdId, setPitchDetailJdId] = useState("");
  const [interviewDetailJdId, setInterviewDetailJdId] = useState("");
  const [interviewInput, setInterviewInput] = useState("");
  const [scorePanel, setScorePanel] = useState<{ title: string; score: InterviewScore } | null>(null);
  const [scoringMessageId, setScoringMessageId] = useState("");
  const [pitchToast, setPitchToast] = useState<{ jdId: string; title: string } | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft>(newApplication);
  const [aiConfig, setAiConfig] = useState<AiConfigDraft>(defaultAiConfig);
  const [aiConfigStatus, setAiConfigStatus] = useState("未配置 API Key 时使用本地模拟结果");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [saveState, setSaveState] = useState("浏览器本地已保存");
  const [resumeToast, setResumeToast] = useState("");
  const [resumeFormError, setResumeFormError] = useState("");
  const [resumeDirty, setResumeDirty] = useState(false);
  const [pendingProjectsDialogOpen, setPendingProjectsDialogOpen] = useState(false);
  const [newResumeDialogOpen, setNewResumeDialogOpen] = useState(false);
  const [resumeImportStatus, setResumeImportStatus] = useState("");
  const [resumeImportProgress, setResumeImportProgress] = useState<number | null>(null);
  const [jdImportStatus, setJdImportStatus] = useState("");
  const [jdImportProgress, setJdImportProgress] = useState<number | null>(null);
  const [jdCompanyWarning, setJdCompanyWarning] = useState("");
  const [selectedJdId, setSelectedJdId] = useState("");

  const activeResume = useMemo(
    () => resumes.find((resume) => resume.id === activeResumeId) ?? resumes[0] ?? defaultResume(),
    [activeResumeId, resumes],
  );
  const selectedJdResume = useMemo(
    () => resumes.find((resume) => resume.id === selectedJdResumeId) ?? activeResume,
    [activeResume, resumes, selectedJdResumeId],
  );
  const profile = activeResume.profile;
  const projects = activeResume.projects;
  const currentJd = selectedJdId
    ? jobDescriptions.find((jd) => jd.id === selectedJdId) ?? latestJd(jobDescriptions)
    : latestJd(jobDescriptions);
  const pitchDetailJd = pitchDetailJdId
    ? jobDescriptions.find((jd) => jd.id === pitchDetailJdId)
    : undefined;
  const interviewDetailJd = interviewDetailJdId
    ? jobDescriptions.find((jd) => jd.id === interviewDetailJdId)
    : undefined;
  const snapshot = useMemo(
    () => ({ profile, projects, resumes, activeResumeId, jobDescriptions, applications }),
    [activeResumeId, applications, jobDescriptions, profile, projects, resumes],
  );

  const averageMatch = useMemo(() => {
    const scored = jobDescriptions.filter((jd) => jd.analysis?.matchScore);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((sum, jd) => sum + (jd.analysis?.matchScore ?? 0), 0) / scored.length);
  }, [jobDescriptions]);

  useEffect(() => {
    let cancelled = false;

    function applySnapshot(parsed: WorkspaceSnapshot, source: "local" | "database") {
      const nextResumes = parsed.resumes?.length
        ? parsed.resumes.map((resume) => normalizeResume(resume))
        : [normalizeResume({}, { profile: parsed.profile, projects: parsed.projects ?? [] })];
      const parsedActiveId = parsed.activeResumeId;
      const nextActiveId = parsedActiveId && nextResumes.some((resume) => resume.id === parsedActiveId)
        ? parsedActiveId
        : (nextResumes[0]?.id ?? defaultResumeId);
      setResumes(nextResumes);
      setActiveResumeId(nextActiveId);
      setSelectedJdResumeId(nextActiveId);
      const nextJobDescriptions = (parsed.jobDescriptions ?? []).map((jd) => normalizeJobDescription(jd));
      setJobDescriptions(nextJobDescriptions);
      setSelectedJdId(nextJobDescriptions[0]?.id ?? "");
      setApplications((parsed.applications ?? []).map((application) => normalizeApplication(application)));
      if (source === "database") setSaveState("已从数据库加载");
    }

    void Promise.resolve().then(() => {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw || cancelled) return;

      try {
        const parsed = JSON.parse(raw) as WorkspaceSnapshot;
        applySnapshot(parsed, "local");
      } catch {
        setSaveState("本地数据读取失败，可继续重新保存");
      }
    });

    void fetch("/api/workspace")
      .then((response) => response.json())
      .then((result: { databaseConfigured?: boolean; snapshot?: WorkspaceSnapshot | null }) => {
        if (cancelled) return;
        if (!result.databaseConfigured) return;
        if (snapshotHasData(result.snapshot)) {
          applySnapshot(result.snapshot as WorkspaceSnapshot, "database");
          return;
        }
        setSaveState("数据库已连接，可同步当前数据");
      })
      .catch(() => {
        if (!cancelled) setSaveState("数据库读取失败，本地数据可用");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const host = window.location.hostname;
      setIsDemoMode(host.startsWith("copilot-interview.") || host === "localhost" || host === "127.0.0.1");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      const raw = window.localStorage.getItem(aiConfigStorageKey);
      if (!raw || cancelled) return;

      try {
        const parsed = JSON.parse(raw) as Partial<AiConfigDraft>;
        const nextConfig = { ...defaultAiConfig, ...parsed };
        setAiConfig(nextConfig);
        setAiConfigStatus(nextConfig.apiKey ? "已加载本地模型配置" : "未配置 API Key 时使用本地模拟结果");
      } catch {
        setAiConfigStatus("模型配置读取失败，可重新填写保存");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDemoMode || aiConfig.apiKey.trim()) return;
    void Promise.resolve().then(() => {
      setAiConfig((current) => (current.apiKey.trim() ? current : { ...demoAiConfig }));
      setAiConfigStatus("面试演示站已启用服务端 DeepSeek 模型，可直接体验分析、生成和模拟面试。");
    });
  }, [aiConfig.apiKey, isDemoMode]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [snapshot]);

  useEffect(() => {
    if (!resumeToast) return;
    const timer = window.setTimeout(() => setResumeToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [resumeToast]);

  useEffect(() => {
    if (!pitchToast) return;
    const timer = window.setTimeout(() => setPitchToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [pitchToast]);

  useEffect(() => {
    function syncDetailRoute() {
      const match = window.location.hash.match(/^#(pitch|interview)\/(.+)$/);
      if (!match) return;
      const [, target, rawId] = match;
      const jdId = decodeURIComponent(rawId);
      if (target === "pitch") {
        setActiveSection("pitch");
        setPitchDetailJdId(jdId);
        setInterviewDetailJdId("");
      }
      if (target === "interview") {
        setActiveSection("interview");
        setInterviewDetailJdId(jdId);
        setPitchDetailJdId("");
      }
    }

    syncDetailRoute();
    window.addEventListener("hashchange", syncDetailRoute);
    return () => window.removeEventListener("hashchange", syncDetailRoute);
  }, []);

  async function saveToDatabase() {
    setIsLoading("save");
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const result = await response.json();
      setSaveState(result.saved ? "已同步到数据库" : result.message || "浏览器本地已保存");
    } catch {
      setSaveState("数据库同步失败，本地保存正常");
    } finally {
      setIsLoading(null);
    }
  }

  function saveAiConfig() {
    const normalized = {
      provider: aiConfig.provider || defaultAiConfig.provider,
      apiKey: aiConfig.apiKey.trim(),
      baseUrl: aiConfig.baseUrl.trim(),
      model: aiConfig.model.trim() || defaultAiConfig.model,
    };
    const providerLabel = aiProviderOptions.find((provider) => provider.id === normalized.provider)?.label ?? "自定义模型";
    setAiConfig(normalized);
    window.localStorage.setItem(aiConfigStorageKey, JSON.stringify(normalized));
    setAiConfigStatus(normalized.apiKey ? `已保存 ${providerLabel}：${normalized.model}` : "已清空 API Key，将使用本地模拟结果");
  }

  function clearAiConfig() {
    setAiConfig(defaultAiConfig);
    window.localStorage.removeItem(aiConfigStorageKey);
    setAiConfigStatus("已清空模型配置，将使用本地模拟结果");
  }

  function updateActiveResume(patch: Partial<ResumeDraft>) {
    const now = new Date().toISOString();
    setResumeFormError("");
    setResumeDirty(true);
    setResumes((current) =>
      current.map((resume) =>
        resume.id === activeResume.id ? { ...resume, ...patch, updatedAt: now } : resume,
      ),
    );
  }

  function updateProfile(key: keyof ProfileDraft, value: string) {
    updateActiveResume({ profile: { ...profile, [key]: value } });
  }

  function getResumeValidationError() {
    const missing: string[] = [];
    if (!activeResume.title.trim()) missing.push("简历名称");
    if (!profile.name.trim()) missing.push("姓名");
    if (!activeResume.targetRole.trim()) missing.push("目标方向");
    return missing.length ? `请先填写 ${missing.join("、")}。` : "";
  }

  function getConfirmedPendingProjects() {
    return pendingImportedProjects
      .filter((project) => project.title.trim() || project.actions.trim() || project.impact.trim())
      .map((project) => ({ ...project, id: crypto.randomUUID(), talkingPoints: "" }));
  }

  function performSaveCurrentResume(options?: { includePendingProjects?: boolean }) {
    const confirmed = options?.includePendingProjects ? getConfirmedPendingProjects() : [];
    const nextProjects = confirmed.length ? [...confirmed, ...projects] : projects;
    updateActiveResume({
      title: activeResume.title.trim() || profile.headline || "未命名简历",
      targetRole: activeResume.targetRole || profile.headline,
      projects: nextProjects,
    });
    if (confirmed.length) setPendingImportedProjects([]);
    setPendingProjectsDialogOpen(false);
    setResumeDirty(false);
    setResumeToast(`已保存：${activeResume.title || profile.headline || "未命名简历"}`);
    setSaveState("浏览器本地已保存");
  }

  function requestSaveCurrentResume() {
    const error = getResumeValidationError();
    if (error) {
      setResumeFormError(error);
      return;
    }

    if (pendingImportedProjects.length) {
      setPendingProjectsDialogOpen(true);
      return;
    }

    performSaveCurrentResume();
  }

  function performAddResume() {
    const nextResume = createResume({
      title: `新简历 ${resumes.length + 1}`,
      targetRole: "",
      profile: { ...defaultProfile, headline: "" },
      projects: [],
    });
    setResumes((current) => [nextResume, ...current]);
    setActiveResumeId(nextResume.id);
    setSelectedJdResumeId(nextResume.id);
    setPendingImportedProjects([]);
    setResumeImportStatus("已新建一份空白简历。");
    setResumeDirty(false);
    setNewResumeDialogOpen(false);
    setResumeFormError("");
  }

  function requestAddResume() {
    const error = getResumeValidationError();
    if (error) {
      setResumeFormError(error);
      return;
    }

    if (resumeDirty) {
      setNewResumeDialogOpen(true);
      return;
    }

    performAddResume();
  }

  function removeResume(id: string) {
    if (resumes.length <= 1) return;
    const nextResumes = resumes.filter((resume) => resume.id !== id);
    const nextActiveId = activeResumeId === id ? nextResumes[0].id : activeResumeId;
    setResumes(nextResumes);
    setActiveResumeId(nextActiveId);
    if (selectedJdResumeId === id) setSelectedJdResumeId(nextActiveId);
    setPendingImportedProjects([]);
  }

  function addProject() {
    if (!draftProject.title.trim()) return;
    updateActiveResume({ projects: [{ ...draftProject, id: crypto.randomUUID() }, ...projects] });
    setDraftProject(emptyProject());
  }

  function updatePendingProject(id: string, patch: Partial<ProjectDraft>) {
    setPendingImportedProjects((current) =>
      current.map((project) => (project.id === id ? { ...project, ...patch } : project)),
    );
  }

  function removePendingProject(id: string) {
    setPendingImportedProjects((current) => current.filter((project) => project.id !== id));
  }

  function confirmPendingProjects() {
    const confirmed = pendingImportedProjects
      .filter((project) => project.title.trim() || project.actions.trim() || project.impact.trim())
      .map((project) => ({ ...project, id: crypto.randomUUID(), talkingPoints: "" }));

    if (!confirmed.length) return;
    updateActiveResume({ projects: [...confirmed, ...projects] });
    setPendingImportedProjects([]);
    setResumeImportStatus(`已添加 ${confirmed.length} 个项目经历。`);
  }

  async function handleResumeFile(file?: File) {
    if (!file) return;
    setIsLoading("resume-import");
    setResumeImportStatus("正在识别简历内容...");
    setResumeImportProgress(3);

    try {
      const result = await extractTextFromFile(file, ({ stage, progress }) => {
        setResumeImportStatus(stage);
        setResumeImportProgress(progress);
      });
      if (!result.text) {
        setResumeImportStatus("没有识别到文本，可以换一个文件或手动粘贴。");
        setResumeImportProgress(null);
        return;
      }

      setResumeImportStatus("正在结构化简历字段...");
      setResumeImportProgress(94);
      const fields = await parseImportedText<ResumeImportFields>("resume", result.text, aiConfig);
      const nextProfile = {
        ...profile,
        name: fields.name || profile.name,
        headline: fields.headline || profile.headline,
        location: fields.location || profile.location,
        email: fields.email || profile.email,
        phone: fields.phone || profile.phone,
        summary: fields.summary || profile.summary,
        resumeText: fields.resumeText || result.text,
      };
      updateActiveResume({
        profile: nextProfile,
        title: activeResume.title === "默认简历" || activeResume.title.startsWith("新简历")
          ? fields.headline || fields.name || activeResume.title
          : activeResume.title,
        targetRole: activeResume.targetRole || fields.headline || "",
      });
      setPendingImportedProjects(
        (fields.projects ?? []).map((project) => ({
          ...project,
          id: project.id || crypto.randomUUID(),
          talkingPoints: "",
        })),
      );
      setResumeImportStatus(
        `已识别 ${file.name}，并回填基础字段${fields.projects?.length ? `，发现 ${fields.projects.length} 个项目待确认` : ""}。`,
      );
      setResumeImportProgress(100);
    } catch (error) {
      setResumeImportStatus(error instanceof Error ? error.message : "导入失败，请换一个文件试试。");
      setResumeImportProgress(null);
    } finally {
      setIsLoading(null);
    }
  }

  async function applyResumeExample() {
    try {
      const file = await loadPublicExampleFile(demoResumePath, "张三-前端开发-示例.pdf", "application/pdf");
      await handleResumeFile(file);
    } catch (error) {
      setResumeImportStatus(error instanceof Error ? error.message : "示例简历加载失败。");
      setResumeImportProgress(null);
    }
  }

  async function handleJdFile(file?: File) {
    if (!file) return;
    setIsLoading("jd-import");
    setJdImportStatus("正在识别 JD 内容...");
    setJdImportProgress(3);
    setJdCompanyWarning("");

    try {
      const result = await extractTextFromFile(file, ({ stage, progress }) => {
        setJdImportStatus(stage);
        setJdImportProgress(progress);
      });
      if (!result.text) {
        setJdImportStatus("没有识别到 JD 文本，可以换一张截图或手动粘贴。");
        setJdImportProgress(null);
        setJdCompanyWarning("缺少公司");
        return;
      }

      setJdImportStatus("正在本地提取 JD 字段...");
      setJdImportProgress(98);
      const fields = parseJdFallback(result.text) satisfies JdImportFields;
      setJdDraft((current) => ({
        ...current,
        company: fields.company || current.company,
        role: fields.role || current.role,
        rawText: fields.rawText || result.text,
      }));
      setJdImportStatus(`已识别 ${file.name}，并回填公司、岗位和 JD 正文。`);
      setJdImportProgress(100);
      setJdCompanyWarning(fields.company || jdDraft.company ? "" : "缺少公司");
    } catch (error) {
      setJdImportStatus(error instanceof Error ? error.message : "导入失败，请换一个文件试试。");
      setJdImportProgress(null);
      setJdCompanyWarning(jdDraft.company ? "" : "缺少公司");
    } finally {
      setIsLoading(null);
    }
  }

  async function applyJdExample() {
    try {
      const file = await loadPublicExampleFile(demoJdPath, "redshop-前端开发-JD.png", "image/png");
      await handleJdFile(file);
    } catch (error) {
      setJdImportStatus(error instanceof Error ? error.message : "示例 JD 加载失败。");
      setJdImportProgress(null);
    }
  }

  async function analyzeJd() {
    if (!jdDraft.rawText.trim()) return;
    const pendingJd: JobDescriptionDraft = {
      id: crypto.randomUUID(),
      company: jdDraft.company || "目标公司",
      role: jdDraft.role || "目标岗位",
      rawText: jdDraft.rawText,
      resumeId: selectedJdResume.id,
      resumeTitle: selectedJdResume.title,
      analysisStatus: "ANALYZING",
      createdAt: new Date().toISOString(),
    };
    setIsLoading("jd");
    setJobDescriptions((current) => [pendingJd, ...current]);
    setSelectedJdId(pendingJd.id);
    setActiveSection("jd");

    try {
      const response = await fetch("/api/jd/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: jdDraft.rawText,
          profile: selectedJdResume.profile,
          projects: selectedJdResume.projects,
          resumeId: selectedJdResume.id,
          resumeTitle: selectedJdResume.title,
          aiConfig,
        }),
      });
      const analysis = (await response.json()) as JdAnalysis;
      setJobDescriptions((current) =>
        current.map((jd) =>
          jd.id === pendingJd.id
            ? { ...jd, analysis, analysisStatus: "DONE" }
            : jd,
        ),
      );
    } catch {
      setJobDescriptions((current) =>
        current.map((jd) => (jd.id === pendingJd.id ? { ...jd, analysisStatus: "FAILED" } : jd)),
      );
    } finally {
      setIsLoading(null);
    }
  }

  function updateJdRecord(id: string, patch: Partial<JobDescriptionDraft>) {
    setJobDescriptions((current) =>
      current.map((jd) => (jd.id === id ? { ...jd, ...patch } : jd)),
    );
  }

  async function generatePitch(jdId?: string) {
    const targetJd = jobDescriptions.find((jd) => jd.id === jdId) ?? currentJd;
    if (!targetJd) return;

    const pitchResume = targetJd.resumeId
      ? resumes.find((resume) => resume.id === targetJd.resumeId) ?? selectedJdResume
      : selectedJdResume;
    setIsLoading(`pitch:${targetJd.id}`);
    updateJdRecord(targetJd.id, { pitchStatus: "GENERATING" });
    try {
      const response = await fetch("/api/generate/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: pitchResume.profile,
          projects: pitchResume.projects,
          jdCompany: targetJd.company || jdDraft.company,
          jdRole: targetJd.role || jdDraft.role,
          jdText: targetJd.rawText || jdDraft.rawText,
          keywords: targetJd.analysis?.keywords ?? [],
          aiConfig,
        }),
      });
      const nextPitch = (await response.json()) as PitchOutput;
      updateJdRecord(targetJd.id, {
        pitch: nextPitch,
        pitchStatus: "DONE",
        pitchUpdatedAt: new Date().toISOString(),
      });
      setPitchToast({ jdId: targetJd.id, title: `${targetJd.company} · ${targetJd.role}` });
    } catch {
      updateJdRecord(targetJd.id, { pitchStatus: "FAILED" });
    } finally {
      setIsLoading(null);
    }
  }

  function getInterviewMessages(jd?: JobDescriptionDraft) {
    return jd?.interview?.messages?.length ? jd.interview.messages : [starterInterviewMessage];
  }

  function updateInterviewSession(
    jdId: string,
    updater: (messages: InterviewMessageDraft[], cache?: InterviewConversationScoreCache) => {
      messages: InterviewMessageDraft[];
      conversationScoreCache?: InterviewConversationScoreCache;
    },
  ) {
    setJobDescriptions((current) =>
      current.map((jd) => {
        if (jd.id !== jdId) return jd;
        const currentMessages = getInterviewMessages(jd);
        const next = updater(currentMessages, jd.interview?.conversationScoreCache);
        return {
          ...jd,
          interview: {
            messages: next.messages,
            conversationScoreCache: next.conversationScoreCache,
            updatedAt: new Date().toISOString(),
          },
        };
      }),
    );
  }

  async function sendInterviewMessage() {
    const targetJd = interviewDetailJd;
    if (!interviewInput.trim()) return;
    if (!targetJd) return;
    const userMessage: InterviewMessageDraft = {
      id: crypto.randomUUID(),
      role: "user",
      content: interviewInput.trim(),
    };
    const assistantMessage: InterviewMessageDraft = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    const currentMessages = getInterviewMessages(targetJd);
    const nextMessages = [...currentMessages, userMessage, assistantMessage];
    updateInterviewSession(targetJd.id, () => ({ messages: nextMessages }));
    setInterviewInput("");
    setIsLoading("interview");

    const context = [
      targetJd.resumeId
        ? (resumes.find((resume) => resume.id === targetJd.resumeId) ?? selectedJdResume).profile.resumeText
        : selectedJdResume.profile.resumeText,
      (targetJd.resumeId
        ? (resumes.find((resume) => resume.id === targetJd.resumeId) ?? selectedJdResume).projects
        : selectedJdResume.projects
      ).map((project) => `${project.title}: ${project.talkingPoints || project.actions}`).join("\n"),
      `${targetJd.company} ${targetJd.role}: ${targetJd.rawText}`,
    ].join("\n\n");

    try {
      const response = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(0, -1), context, aiConfig }),
      });
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let content = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        updateInterviewSession(targetJd.id, (currentMessages, cache) => ({
          messages: currentMessages.map((message) =>
            message.id === assistantMessage.id ? { ...message, content } : message,
          ),
          conversationScoreCache: cache,
        }));
      }
    } finally {
      setIsLoading(null);
    }
  }

  function getInterviewScoreContext() {
    const targetJd = interviewDetailJd;
    const targetResume = targetJd?.resumeId
      ? resumes.find((resume) => resume.id === targetJd.resumeId) ?? selectedJdResume
      : selectedJdResume;
    return [
      targetJd ? `${targetJd.company} ${targetJd.role}: ${targetJd.rawText}` : "",
      targetResume.profile.resumeText,
      targetResume.projects.map((project) => `${project.title}: ${project.actions || project.talkingPoints}`).join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  async function scoreMessage(messageId: string) {
    const targetJd = interviewDetailJd;
    if (!targetJd) return;
    const messages = getInterviewMessages(targetJd);
    const targetMessage = messages.find((message) => message.id === messageId && message.role === "user");
    if (!targetMessage?.content.trim()) return;
    if (targetMessage.score) {
      setScorePanel({ title: "单条回答评分", score: targetMessage.score });
      return;
    }

    setScoringMessageId(messageId);
    try {
      const response = await fetch("/api/interview/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: targetMessage.content,
          context: getInterviewScoreContext(),
          aiConfig,
        }),
      });
      const nextScore = (await response.json()) as InterviewScore;
      updateInterviewSession(targetJd.id, (currentMessages, cache) => ({
        messages: currentMessages.map((message) => (message.id === messageId ? { ...message, score: nextScore } : message)),
        conversationScoreCache: cache,
      }));
      setScorePanel({ title: "单条回答评分", score: nextScore });
    } finally {
      setScoringMessageId("");
    }
  }

  async function scoreConversation() {
    const targetJd = interviewDetailJd;
    if (!targetJd) return;
    const messages = getInterviewMessages(targetJd);
    const userMessages = messages.filter((message) => message.role === "user" && message.content.trim());
    if (!userMessages.length) return;

    const signature = messages.map((message) => `${message.role}:${message.content}`).join("\n");
    if (targetJd.interview?.conversationScoreCache?.signature === signature) {
      setScorePanel({ title: "整体面试评分", score: targetJd.interview.conversationScoreCache.score });
      return;
    }

    setIsLoading("score");
    try {
      const response = await fetch("/api/interview/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: messages.map((message) => `${message.role === "user" ? "候选人" : "面试官"}：${message.content}`).join("\n"),
          context: getInterviewScoreContext(),
          aiConfig,
        }),
      });
      const nextScore = (await response.json()) as InterviewScore;
      updateInterviewSession(targetJd.id, (currentMessages) => ({
        messages: currentMessages,
        conversationScoreCache: { signature, score: nextScore },
      }));
      setScorePanel({ title: "整体面试评分", score: nextScore });
    } finally {
      setIsLoading(null);
    }
  }

  function addApplication() {
    if (!applicationDraft.company.trim() || !applicationDraft.role.trim()) return;
    const nextApplication = normalizeApplication(applicationDraft);
    setApplications((current) => [
      { ...nextApplication, id: crypto.randomUUID(), updatedAt: new Date().toISOString() },
      ...current,
    ]);
    setApplicationDraft(newApplication());
  }

  function updateApplication(id: string, patch: Partial<ApplicationDraft>) {
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, ...patch, updatedAt: new Date().toISOString() } : application,
      ),
    );
  }

  function selectJd(jd: JobDescriptionDraft) {
    setSelectedJdId(jd.id);
    setJdDraft({
      company: jd.company,
      role: jd.role,
      rawText: jd.rawText,
    });
  }

  function openPitchDetail(jdId: string) {
    setPitchDetailJdId(jdId);
    window.history.pushState(null, "", `#pitch/${encodeURIComponent(jdId)}`);
  }

  function closePitchDetail() {
    setPitchDetailJdId("");
    if (window.location.hash.startsWith("#pitch/")) window.history.pushState(null, "", window.location.pathname);
  }

  function openInterviewDetail(jdId: string) {
    setInterviewDetailJdId(jdId);
    setInterviewInput("");
    setScorePanel(null);
    window.history.pushState(null, "", `#interview/${encodeURIComponent(jdId)}`);
  }

  function closeInterviewDetail() {
    setInterviewDetailJdId("");
    setInterviewInput("");
    setScorePanel(null);
    if (window.location.hash.startsWith("#interview/")) window.history.pushState(null, "", window.location.pathname);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {resumeToast ? (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-md border border-emerald-500/25 bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 shadow-lg">
          <span className="inline-flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            {resumeToast}
          </span>
        </div>
      ) : null}
      {pitchToast ? (
        <div className="fixed right-5 top-4 z-[60] w-[min(420px,calc(100vw-2.5rem))] rounded-md border border-emerald-500/25 bg-card p-4 text-sm shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-emerald-200">话术生成完毕</p>
              <p className="mt-1 text-muted-foreground">{pitchToast.title}</p>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => setPitchToast(null)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                openPitchDetail(pitchToast.jdId);
                setActiveSection("pitch");
                setPitchToast(null);
              }}
            >
              查看详情
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={pendingProjectsDialogOpen} onOpenChange={setPendingProjectsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>还有待确认项目经历</DialogTitle>
            <DialogDescription>
              当前简历中还有从导入内容识别出的项目经历没有确认。保存前建议先添加到项目素材库，避免后续 JD 匹配遗漏这些项目。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => performSaveCurrentResume({ includePendingProjects: true })}>
              <Plus className="size-4" />
              添加全部
            </Button>
            <Button variant="outline" onClick={() => setPendingProjectsDialogOpen(false)}>
              返回确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newResumeDialogOpen} onOpenChange={setNewResumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>当前简历还没保存</DialogTitle>
            <DialogDescription>
              你正在编辑的简历有未保存改动。继续新建会切换到一份空白简历，请确认当前内容已经不需要继续保存。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewResumeDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={performAddResume}>
              继续新建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[248px_1fr]">
        <aside className="border-sidebar-border bg-sidebar/95 lg:border-r">
          <div className="flex h-full flex-col gap-5 px-4 py-5">
            <div className="flex items-center gap-3 px-2">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Layers3 className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">面试 Copilot</p>
                <p className="text-xs text-muted-foreground">AI 求职工作台</p>
              </div>
            </div>

            <nav className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    className={`flex h-10 items-center gap-3 rounded-md px-3 text-left text-sm transition ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    }`}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto rounded-md border border-sidebar-border bg-background/55 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardCheck className="size-4 text-emerald-300" />
                {saveState}
              </div>
              <Button className="mt-3 w-full" size="sm" onClick={saveToDatabase} disabled={isLoading === "save"}>
                {isLoading === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                同步数据库
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="border-b px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-normal">AI 求职/面试 Copilot 工作台</h1>
                <Badge variant="secondary">MVP</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                从简历维护、JD 匹配、定制话术到模拟面试和投递复盘，聚合成一个可讲清楚的 AI 全栈项目。
              </p>
            </div>
          </header>

          <div className="p-5">
            {activeSection === "overview" && (
              <Overview
                applications={applications}
                averageMatch={averageMatch}
                currentJd={currentJd}
                isDemoMode={isDemoMode}
                profile={profile}
                projects={projects}
                resumeTitle={activeResume.title}
                setActiveSection={setActiveSection}
              />
            )}
            {activeSection === "profile" && (
              <ProfileProjects
                addProject={addProject}
                addResume={requestAddResume}
                applyResumeExample={applyResumeExample}
                activeResume={activeResume}
                activeResumeId={activeResumeId}
                confirmPendingProjects={confirmPendingProjects}
                draftProject={draftProject}
                handleResumeFile={handleResumeFile}
                isDemoMode={isDemoMode}
                isImporting={isLoading === "resume-import"}
                pendingImportedProjects={pendingImportedProjects}
                profile={profile}
                projects={projects}
                removeResume={removeResume}
                resumes={resumes}
                resumeFormError={resumeFormError}
                resumeImportProgress={resumeImportProgress}
                resumeImportStatus={resumeImportStatus}
                removePendingProject={removePendingProject}
                saveCurrentResume={requestSaveCurrentResume}
                setActiveResumeId={(id) => {
                  setActiveResumeId(id);
                  setPendingImportedProjects([]);
                  setResumeDirty(false);
                  setResumeFormError("");
                }}
                setDraftProject={setDraftProject}
                updateActiveResume={updateActiveResume}
                updatePendingProject={updatePendingProject}
                updateProfile={updateProfile}
              />
            )}
            {activeSection === "jd" && (
              <JdPanel
                analyzeJd={analyzeJd}
                applyJdExample={applyJdExample}
                currentJd={currentJd}
                handleJdFile={handleJdFile}
                isDemoMode={isDemoMode}
                isLoading={isLoading === "jd"}
                isImporting={isLoading === "jd-import"}
                jdCompanyWarning={jdCompanyWarning}
                jdDraft={jdDraft}
                jdImportProgress={jdImportProgress}
                jdImportStatus={jdImportStatus}
                jobDescriptions={jobDescriptions}
                resumes={resumes}
                selectJd={selectJd}
                selectedJdId={currentJd?.id ?? ""}
                selectedResumeId={selectedJdResume.id}
                setSelectedResumeId={setSelectedJdResumeId}
                setJdDraft={setJdDraft}
              />
            )}
            {activeSection === "pitch" && (
              <PitchPanel
                detailJd={pitchDetailJd}
                generatePitch={generatePitch}
                generatingPitchId={isLoading?.startsWith("pitch:") ? isLoading.slice("pitch:".length) : ""}
                jobDescriptions={jobDescriptions}
                openDetail={openPitchDetail}
                closeDetail={closePitchDetail}
              />
            )}
            {activeSection === "interview" && (
              <InterviewPanel
                closeDetail={closeInterviewDetail}
                detailJd={interviewDetailJd}
                input={interviewInput}
                isInterviewLoading={isLoading === "interview"}
                isScoreLoading={isLoading === "score"}
                jobDescriptions={jobDescriptions}
                messages={getInterviewMessages(interviewDetailJd)}
                openDetail={openInterviewDetail}
                scoreConversation={scoreConversation}
                scoreMessage={scoreMessage}
                scorePanel={scorePanel}
                scoringMessageId={scoringMessageId}
                sendInterviewMessage={sendInterviewMessage}
                setInput={setInterviewInput}
              />
            )}
            {activeSection === "applications" && (
              <ApplicationPanel
                addApplication={addApplication}
                applicationDraft={applicationDraft}
                applications={applications}
                jobDescriptions={jobDescriptions}
                setApplicationDraft={setApplicationDraft}
                updateApplication={updateApplication}
              />
            )}
            {activeSection === "settings" && (
              <SettingsPanel
                aiConfig={aiConfig}
                aiConfigStatus={aiConfigStatus}
                clearAiConfig={clearAiConfig}
                saveAiConfig={saveAiConfig}
                setAiConfig={setAiConfig}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Overview(props: {
  applications: ApplicationDraft[];
  averageMatch: number;
  currentJd?: JobDescriptionDraft;
  isDemoMode: boolean;
  profile: ProfileDraft;
  projects: ProjectDraft[];
  resumeTitle: string;
  setActiveSection: (section: Section) => void;
}) {
  const activeApplications = props.applications.filter((item) => item.status !== "ARCHIVED").length;
  const usableProjects = props.projects.filter(
    (project) =>
      project.id !== "starter-ai-workbench" &&
      project.title !== "AI 求职/面试 Copilot 工作台" &&
      project.title.trim() &&
      (project.actions.trim() || project.challenge.trim() || project.impact.trim()),
  );
  const hasRealHeadline = props.profile.headline.trim() && props.profile.headline !== "前端 / AI 全栈开发候选人";
  const materialScore = Math.min(
    100,
    Math.round(
      (props.profile.name.trim() ? 12 : 0) +
        (hasRealHeadline ? 12 : 0) +
        (props.profile.phone.trim() ? 8 : 0) +
        (props.profile.email.trim() ? 8 : 0) +
        (props.profile.resumeText.trim() ? 25 : 0) +
        (props.profile.summary.trim() ? 15 : 0) +
        Math.min(20, usableProjects.length * 10),
    ),
  );

  return (
    <div className="grid gap-4">
      {props.isDemoMode ? (
        <Card className="border-emerald-500/25 bg-emerald-500/5">
          <CardHeader>
            <CardTitle>面试官体验 Demo</CardTitle>
            <CardDescription>
              这是 AI 求职/面试 Copilot 的演示站，已准备示例简历和示例 JD，可直接体验从导入、匹配分析、话术生成到模拟面试的完整工作流。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Insight text="简历项目页和 JD 分析页提供“应用示例”按钮，无需上传真实个人资料即可体验。" />
            <Insight text="演示站已接入服务端 DeepSeek 模型配置，未填写个人 API Key 也可以体验 AI 分析、生成和流式面试。" />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="当前简历素材度" value={`${materialScore}%`} hint={`${props.resumeTitle || "当前简历"} · 联系方式、正文、摘要、项目共同计算`} />
        <MetricCard label="项目素材" value={`${props.projects.length}`} hint="建议准备 2-3 个可深挖项目" />
        <MetricCard label="平均匹配度" value={`${props.averageMatch || 0}%`} hint="来自已分析 JD" />
        <MetricCard label="活跃投递" value={`${activeApplications}`} hint="未归档岗位数量" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>下一步工作流</CardTitle>
            <CardDescription>按这个顺序推进，项目演示和真实求职都比较顺。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {[
              ["补全简历和项目", "把项目背景、动作、结果写成面试可讲素材。", "profile"],
              ["粘贴目标 JD", "拆关键词、缺口、匹配优势和补强建议。", "jd"],
              ["生成定制话术", "产出自我介绍、简历 bullet、项目讲法。", "pitch"],
              ["模拟面试复盘", "流式追问并按四维度评分。", "interview"],
            ].map(([title, desc, section]) => (
              <button
                key={title}
                className="rounded-md border bg-card p-4 text-left transition hover:bg-muted/60"
                onClick={() => props.setActiveSection(section as Section)}
              >
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近 JD</CardTitle>
            <CardDescription>{props.currentJd ? `${props.currentJd.company} · ${props.currentJd.role}` : "暂无分析记录"}</CardDescription>
          </CardHeader>
          <CardContent>
            {props.currentJd?.analysis ? (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>匹配度</span>
                    <span className={metricTone(props.currentJd.analysis.matchScore)}>{props.currentJd.analysis.matchScore}%</span>
                  </div>
                  <Progress value={props.currentJd.analysis.matchScore} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {props.currentJd.analysis.keywords.slice(0, 8).map((keyword) => (
                    <Badge key={keyword} variant="outline">{keyword}</Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{props.currentJd.analysis.summary}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">粘贴一个 JD 后，这里会显示最近一次匹配结果。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-2xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{props.hint}</p>
      </CardContent>
    </Card>
  );
}

function ProfileProjects(props: {
  addProject: () => void;
  addResume: () => void;
  applyResumeExample: () => void;
  activeResume: ResumeDraft;
  activeResumeId: string;
  confirmPendingProjects: () => void;
  draftProject: ProjectDraft;
  handleResumeFile: (file?: File) => void;
  isDemoMode: boolean;
  isImporting: boolean;
  pendingImportedProjects: ProjectDraft[];
  profile: ProfileDraft;
  projects: ProjectDraft[];
  removeResume: (id: string) => void;
  resumes: ResumeDraft[];
  resumeFormError: string;
  resumeImportProgress: number | null;
  resumeImportStatus: string;
  removePendingProject: (id: string) => void;
  saveCurrentResume: () => void;
  setActiveResumeId: (id: string) => void;
  setDraftProject: (project: ProjectDraft) => void;
  updateActiveResume: (patch: Partial<ResumeDraft>) => void;
  updatePendingProject: (id: string, patch: Partial<ProjectDraft>) => void;
  updateProfile: (key: keyof ProfileDraft, value: string) => void;
}) {
  const [editingProject, setEditingProject] = useState<ProjectDraft | null>(null);

  function saveEditingProject() {
    if (!editingProject) return;
    props.updateActiveResume({
      projects: props.projects.map((project) => (project.id === editingProject.id ? editingProject : project)),
    });
    setEditingProject(null);
  }

  return (
    <>
    <div className="grid items-start gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="self-start">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>简历与个人定位</CardTitle>
            <CardDescription>支持粘贴文本，也支持导入 Word、PDF 和图片。</CardDescription>
          </div>
          <div className="grid gap-2 md:justify-items-end">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={props.addResume}>
                <Plus className="size-4" />
                新建简历
              </Button>
              <Button variant="outline" size="sm" onClick={props.saveCurrentResume}>
                <Save className="size-4" />
                保存简历
              </Button>
              {props.isDemoMode ? (
                <Button variant="secondary" size="sm" onClick={props.applyResumeExample} disabled={props.isImporting}>
                  {props.isImporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                  应用示例
                </Button>
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" size="sm">
                    <label className="cursor-pointer">
                      {props.isImporting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      导入简历
                      <input className="hidden" type="file" accept={getSupportedImportAccept("resume")} onChange={(event) => props.handleResumeFile(event.target.files?.[0])} />
                    </label>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>支持 .txt、.md、.docx、.pdf 和常见图片</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {props.resumeFormError ? (
            <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {props.resumeFormError}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="grid gap-2">
              <Label>当前简历</Label>
              <Select value={props.activeResumeId} onValueChange={props.setActiveResumeId}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {props.resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>{resume.title || "未命名简历"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              label="简历名称"
              value={props.activeResume.title}
              onChange={(value) => props.updateActiveResume({ title: value })}
            />
            <div className="flex items-end">
              <Button
                className="w-full md:w-auto"
                variant="ghost"
                onClick={() => props.removeResume(props.activeResumeId)}
                disabled={props.resumes.length <= 1}
              >
                删除
              </Button>
            </div>
          </div>
          <Field
            label="目标方向"
            value={props.activeResume.targetRole}
            onChange={(value) => props.updateActiveResume({ targetRole: value })}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="姓名" value={props.profile.name} onChange={(value) => props.updateProfile("name", value)} />
            <Field label="定位" value={props.profile.headline} onChange={(value) => props.updateProfile("headline", value)} />
            <Field label="城市" value={props.profile.location} onChange={(value) => props.updateProfile("location", value)} />
            <Field label="邮箱" value={props.profile.email} onChange={(value) => props.updateProfile("email", value)} />
            <Field label="电话" value={props.profile.phone} onChange={(value) => props.updateProfile("phone", value)} />
          </div>
          <div className="grid gap-2">
            <Label>个人摘要</Label>
            <Textarea value={props.profile.summary} onChange={(event) => props.updateProfile("summary", event.target.value)} placeholder="例如：3 年前端经验，关注复杂业务系统、AI 应用集成和工程化..." />
          </div>
          <div className="grid gap-2">
            <Label>简历正文</Label>
            <Textarea className="max-h-[520px] min-h-64 overflow-y-auto resize-y" value={props.profile.resumeText} onChange={(event) => props.updateProfile("resumeText", event.target.value)} placeholder="粘贴你的简历文本，后续 JD 分析和话术生成都会引用这里。" />
            {props.resumeImportStatus ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{props.resumeImportStatus}</span>
                  {props.resumeImportProgress !== null ? <span>{props.resumeImportProgress}%</span> : null}
                </div>
                {props.resumeImportProgress !== null ? <Progress value={props.resumeImportProgress} /> : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>新增项目经历</CardTitle>
            <CardDescription>背景、个人贡献、成果不是必填，但写得越清楚，后续 AI 话术越准。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="项目名" value={props.draftProject.title} onChange={(value) => props.setDraftProject({ ...props.draftProject, title: value })} />
              <Field label="你的角色" value={props.draftProject.role} onChange={(value) => props.setDraftProject({ ...props.draftProject, role: value })} />
            </div>
            <Field label="技术栈" value={props.draftProject.stack} onChange={(value) => props.setDraftProject({ ...props.draftProject, stack: value })} />
            <TextareaField className="min-h-20" label="背景" value={props.draftProject.challenge} onChange={(value) => props.setDraftProject({ ...props.draftProject, challenge: value })} />
            <TextareaField className="min-h-24" label="个人贡献" value={props.draftProject.actions} onChange={(value) => props.setDraftProject({ ...props.draftProject, actions: value })} />
            <TextareaField className="min-h-20" label="成果" value={props.draftProject.impact} onChange={(value) => props.setDraftProject({ ...props.draftProject, impact: value })} />
            <Button onClick={props.addProject}><Plus className="size-4" />添加项目</Button>
          </CardContent>
        </Card>

        {props.pendingImportedProjects.length ? (
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>待确认项目经历</CardTitle>
                <CardDescription>从简历中自动识别，可修改后批量添加。</CardDescription>
              </div>
              <Button onClick={props.confirmPendingProjects}>
                <Plus className="size-4" />
                添加全部
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4">
              {props.pendingImportedProjects.map((project, index) => (
                <div key={project.id} className="grid gap-3 rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">项目 {index + 1}</p>
                    <Button variant="ghost" size="sm" onClick={() => props.removePendingProject(project.id)}>
                      移除
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="项目名" value={project.title} onChange={(value) => props.updatePendingProject(project.id, { title: value })} />
                    <Field label="你的角色" value={project.role} onChange={(value) => props.updatePendingProject(project.id, { role: value })} />
                  </div>
                  <Field label="技术栈" value={project.stack} onChange={(value) => props.updatePendingProject(project.id, { stack: value })} />
                  <TextareaField label="背景" value={project.challenge} onChange={(value) => props.updatePendingProject(project.id, { challenge: value })} />
                  <TextareaField label="个人贡献" value={project.actions} onChange={(value) => props.updatePendingProject(project.id, { actions: value })} />
                  <TextareaField label="成果" value={project.impact} onChange={(value) => props.updatePendingProject(project.id, { impact: value })} />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>项目素材库</CardTitle>
            <CardDescription>JD 分析和话术生成会优先引用这里。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {props.projects.map((project) => (
              <button
                key={project.id}
                className="rounded-md border p-4 text-left transition hover:bg-muted/45"
                onClick={() => setEditingProject(project)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{project.title}</p>
                  <Badge variant="secondary">{project.role || "角色待补充"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{project.impact || project.challenge}</p>
                <p className="mt-3 font-mono text-xs text-muted-foreground">{project.stack}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
    <Dialog open={Boolean(editingProject)} onOpenChange={(open) => !open && setEditingProject(null)}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑项目经历</DialogTitle>
          <DialogDescription>保存后会更新当前简历的项目素材库。</DialogDescription>
        </DialogHeader>
        {editingProject ? (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="项目名" value={editingProject.title} onChange={(value) => setEditingProject({ ...editingProject, title: value })} />
              <Field label="你的角色" value={editingProject.role} onChange={(value) => setEditingProject({ ...editingProject, role: value })} />
            </div>
            <Field label="技术栈" value={editingProject.stack} onChange={(value) => setEditingProject({ ...editingProject, stack: value })} />
            <TextareaField className="min-h-24" label="背景" value={editingProject.challenge} onChange={(value) => setEditingProject({ ...editingProject, challenge: value })} />
            <TextareaField className="min-h-28" label="个人贡献" value={editingProject.actions} onChange={(value) => setEditingProject({ ...editingProject, actions: value })} />
            <TextareaField className="min-h-24" label="成果" value={editingProject.impact} onChange={(value) => setEditingProject({ ...editingProject, impact: value })} />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditingProject(null)}>取消</Button>
          <Button onClick={saveEditingProject}>保存项目</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function Field(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}

function TextareaField(props: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Textarea className={props.className} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </div>
  );
}

function JdPanel(props: {
  analyzeJd: () => void;
  applyJdExample: () => void;
  currentJd?: JobDescriptionDraft;
  handleJdFile: (file?: File) => void;
  isDemoMode: boolean;
  isImporting: boolean;
  isLoading: boolean;
  jdCompanyWarning: string;
  jdDraft: { company: string; role: string; rawText: string };
  jdImportProgress: number | null;
  jdImportStatus: string;
  jobDescriptions: JobDescriptionDraft[];
  resumes: ResumeDraft[];
  selectJd: (jd: JobDescriptionDraft) => void;
  selectedJdId: string;
  selectedResumeId: string;
  setSelectedResumeId: (id: string) => void;
  setJdDraft: (draft: { company: string; role: string; rawText: string }) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>粘贴 JD</CardTitle>
            <CardDescription>输入公司、岗位和完整 JD，也可以直接导入截图、PDF 或文本。</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.isDemoMode ? (
              <Button variant="secondary" size="sm" onClick={props.applyJdExample} disabled={props.isImporting}>
                {props.isImporting ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                应用示例
              </Button>
            ) : null}
            <label className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm text-muted-foreground hover:bg-muted">
              {props.isImporting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              导入 JD 截图/文件
              <input className="hidden" type="file" accept={getSupportedImportAccept("jd")} onChange={(event) => props.handleJdFile(event.target.files?.[0])} />
            </label>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label>用于匹配的简历</Label>
            <Select value={props.selectedResumeId} onValueChange={props.setSelectedResumeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {props.resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.title || "未命名简历"}{resume.targetRole ? ` · ${resume.targetRole}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Label>公司</Label>
                {props.jdCompanyWarning && !props.jdDraft.company ? <span className="text-xs text-amber-300">{props.jdCompanyWarning}</span> : null}
              </div>
              <Input value={props.jdDraft.company} onChange={(event) => props.setJdDraft({ ...props.jdDraft, company: event.target.value })} />
            </div>
            <Field label="岗位" value={props.jdDraft.role} onChange={(value) => props.setJdDraft({ ...props.jdDraft, role: value })} />
          </div>
          {props.jdImportStatus ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{props.jdImportStatus}</span>
                {props.jdImportProgress !== null ? <span>{props.jdImportProgress}%</span> : null}
              </div>
              {props.jdImportProgress !== null ? <Progress value={props.jdImportProgress} /> : null}
            </div>
          ) : null}
          <Textarea className="min-h-96" value={props.jdDraft.rawText} onChange={(event) => props.setJdDraft({ ...props.jdDraft, rawText: event.target.value })} placeholder="粘贴 JD 原文，包括岗位职责、任职要求、加分项..." />
          <Button onClick={props.analyzeJd} disabled={props.isLoading}>
            {props.isLoading ? <Loader2 className="size-4 animate-spin" /> : <Gauge className="size-4" />}
            分析匹配度
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>匹配分析</CardTitle>
            <CardDescription>
              {props.currentJd
                ? `${props.currentJd.company} · ${props.currentJd.role}${props.currentJd.resumeTitle ? ` · ${props.currentJd.resumeTitle}` : ""}`
                : "等待分析"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {props.currentJd?.analysisStatus === "ANALYZING" ? (
              <div className="space-y-4 rounded-md border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  正在分析匹配度
                </div>
                <Progress value={62} />
                <p className="text-sm text-muted-foreground">
                  已创建历史记录，正在拆解岗位职责、任职要求、关键词和简历证据。
                </p>
              </div>
            ) : props.currentJd?.analysisStatus === "FAILED" ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                分析失败，可以重新点击“分析匹配度”。
              </div>
            ) : props.currentJd?.analysis ? (
              <Tabs defaultValue="summary">
                <TabsList>
                  <TabsTrigger value="summary">概览</TabsTrigger>
                  <TabsTrigger value="keywords">关键词</TabsTrigger>
                  <TabsTrigger value="actions">补强</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>匹配度</span>
                      <span className={metricTone(props.currentJd.analysis.matchScore)}>{props.currentJd.analysis.matchScore}%</span>
                    </div>
                    <Progress value={props.currentJd.analysis.matchScore} />
                  </div>
                  <p className="text-sm text-muted-foreground">{props.currentJd.analysis.summary}</p>
                  {props.currentJd.analysis.strengths.map((item) => <Insight key={item} text={item} />)}
                </TabsContent>
                <TabsContent value="keywords" className="flex flex-wrap gap-2">
                  {props.currentJd.analysis.keywords.map((keyword) => <Badge key={keyword} variant="secondary">{keyword}</Badge>)}
                </TabsContent>
                <TabsContent value="actions" className="space-y-3">
                  {props.currentJd.analysis.gaps.map((gap) => <Badge key={gap} variant="outline">{gap}</Badge>)}
                  <Separator />
                  {props.currentJd.analysis.suggestions.map((item) => <Insight key={item} text={item} />)}
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">分析结果会展示结构化匹配度、关键词、缺口和建议。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>历史 JD</CardTitle>
            <CardDescription>保留最近分析记录，方便面试前回看。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {props.jobDescriptions.length ? props.jobDescriptions.map((jd) => (
              <button
                key={jd.id}
                className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition hover:bg-muted/50 ${
                  props.selectedJdId === jd.id ? "border-primary/50 bg-primary/10" : ""
                }`}
                onClick={() => props.selectJd(jd)}
              >
                <div>
                  <p className="text-sm font-medium">{jd.company} · {jd.role}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(jd.createdAt).toLocaleString()}{jd.resumeTitle ? ` · ${jd.resumeTitle}` : ""}
                  </p>
                </div>
                {jd.analysisStatus === "ANALYZING" ? (
                  <Badge variant="outline">
                    <Loader2 className="size-3 animate-spin" />
                    分析中
                  </Badge>
                ) : jd.analysisStatus === "FAILED" ? (
                  <Badge variant="destructive">失败</Badge>
                ) : (
                  <Badge>{jd.analysis?.matchScore ?? 0}%</Badge>
                )}
              </button>
            )) : <p className="text-sm text-muted-foreground">暂无历史记录。</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Insight(props: { text: string }) {
  return <div className="rounded-md border bg-muted/35 p-3 text-sm text-muted-foreground">{props.text}</div>;
}

function SettingsPanel(props: {
  aiConfig: AiConfigDraft;
  aiConfigStatus: string;
  clearAiConfig: () => void;
  saveAiConfig: () => void;
  setAiConfig: (config: AiConfigDraft) => void;
}) {
  const hasKey = Boolean(props.aiConfig.apiKey.trim());
  const selectedProvider = aiProviderOptions.find((provider) => provider.id === props.aiConfig.provider) ?? aiProviderOptions[0];
  const modelOptions = Array.from(new Set([...selectedProvider.models, props.aiConfig.model].filter(Boolean)));

  function selectProvider(providerId: string) {
    const provider = aiProviderOptions.find((item) => item.id === providerId) ?? aiProviderOptions[0];
    props.setAiConfig({
      ...props.aiConfig,
      provider: provider.id,
      baseUrl: provider.baseUrl,
      model: provider.models[0] ?? props.aiConfig.model,
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>模型配置</CardTitle>
          <CardDescription>使用你自己的模型额度。支持 OpenAI 兼容接口，配置只保存在当前浏览器本地。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>模型供应商</Label>
            <Select value={props.aiConfig.provider} onValueChange={selectProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aiProviderOptions.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">{selectedProvider.description}</p>
          </div>
          <div className="grid gap-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={props.aiConfig.apiKey}
              onChange={(event) => props.setAiConfig({ ...props.aiConfig, apiKey: event.target.value })}
              placeholder="粘贴当前供应商的 API Key"
            />
          </div>
          <div className="grid gap-2">
            <Label>Base URL</Label>
            <Input
              value={props.aiConfig.baseUrl}
              onChange={(event) => props.setAiConfig({ ...props.aiConfig, baseUrl: event.target.value })}
              placeholder="OpenAI 官方接口可留空；兼容服务通常是 https://.../v1"
            />
          </div>
          <div className="grid gap-2">
            <Label>推荐模型</Label>
            <Select
              value={props.aiConfig.model}
              onValueChange={(model) => props.setAiConfig({ ...props.aiConfig, model })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model) => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>自定义模型名</Label>
            <Input
              value={props.aiConfig.model}
              onChange={(event) => props.setAiConfig({ ...props.aiConfig, model: event.target.value })}
              placeholder="例如 deepseek-v4-flash、gemini-3.5-flash、qwen-plus"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={props.saveAiConfig}>
              <Save className="size-4" />
              保存配置
            </Button>
            <Button variant="outline" onClick={props.clearAiConfig}>
              清空配置
            </Button>
          </div>
          <div className={`rounded-md border px-3 py-2 text-sm ${hasKey ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-amber-500/25 bg-amber-500/10 text-amber-200"}`}>
            {props.aiConfigStatus}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>生效范围</CardTitle>
          <CardDescription>保存后，以下能力会优先使用你的模型配置。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {aiProviderOptions
              .filter((provider) => provider.id !== "custom")
              .map((provider) => (
                <Badge key={provider.id} variant={provider.id === props.aiConfig.provider ? "secondary" : "outline"}>
                  {provider.label}
                </Badge>
              ))}
          </div>
          <Separator />
          {[
            "简历/项目导入后的结构化解析",
            "JD 匹配前的本地字段抽取",
            "JD 匹配度分析",
            "定制话术生成",
            "AI 模拟面试流式对话",
            "面试回答评分",
          ].map((item) => (
            <Insight key={item} text={item} />
          ))}
          <Separator />
          <p className="text-sm leading-6 text-muted-foreground">
            当前版本使用 OpenAI 兼容协议调用模型。Claude 原生接口这类非兼容协议，建议先通过 OpenRouter 等统一入口接入。
            API Key 不会写入数据库同步接口；它只存在于本机浏览器 localStorage。换浏览器或清空站点数据后需要重新填写。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function PitchPanel(props: {
  closeDetail: () => void;
  detailJd?: JobDescriptionDraft;
  generatePitch: (jdId?: string) => void;
  generatingPitchId: string;
  jobDescriptions: JobDescriptionDraft[];
  openDetail: (jdId: string) => void;
}) {
  const analyzedJds = props.jobDescriptions.filter((jd) => jd.analysisStatus === "DONE" && jd.analysis);

  if (props.detailJd) {
    const isGenerating = props.generatingPitchId === props.detailJd.id;
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Button className="mb-3" size="sm" variant="ghost" onClick={props.closeDetail}>
                <ArrowLeft className="size-4" />
                返回话术列表
              </Button>
              <CardTitle>话术详情</CardTitle>
              <CardDescription>
                {props.detailJd.company} · {props.detailJd.role}
                {props.detailJd.resumeTitle ? ` · ${props.detailJd.resumeTitle}` : ""}
              </CardDescription>
            </div>
            <Button onClick={() => props.generatePitch(props.detailJd?.id)} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {props.detailJd.pitch ? "重新生成" : "生成话术"}
            </Button>
          </CardHeader>
        </Card>

        {props.detailJd.pitchStatus === "GENERATING" ? (
          <Card>
            <CardContent className="space-y-4 py-8">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 animate-spin text-primary" />
                正在生成这条 JD 的定制话术
              </div>
              <Progress value={68} />
            </CardContent>
          </Card>
        ) : props.detailJd.pitch ? (
          <div className="columns-1 gap-4 xl:columns-2">
            <PitchCard title="自我介绍" items={[props.detailJd.pitch.intro]} />
            <PitchCard title="简历 Bullet" items={props.detailJd.pitch.resumeBullets} />
            <PitchCard title="项目话术" items={props.detailJd.pitch.projectTalkTrack} />
            <PitchCard title="风险追问准备" items={props.detailJd.pitch.riskNotes} />
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-4 py-10 text-sm text-muted-foreground">
              <p>这条 JD 还没有生成话术。生成后会绑定在这条分析记录下，不影响其他页面操作。</p>
              <div>
                <Button onClick={() => props.generatePitch(props.detailJd?.id)} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  生成话术
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>定制版面试材料</CardTitle>
          <CardDescription>每条话术都绑定一条 JD 分析记录，方便按岗位回看和重新生成。</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3">
        {analyzedJds.length ? analyzedJds.map((jd) => {
          const isGenerating = props.generatingPitchId === jd.id || jd.pitchStatus === "GENERATING";
          return (
            <Card key={jd.id}>
              <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{jd.company} · {jd.role}</p>
                    <Badge variant="outline">匹配 {jd.analysis?.matchScore ?? 0}%</Badge>
                    {jd.pitch ? <Badge variant="secondary">已生成</Badge> : <Badge variant="outline">未生成</Badge>}
                    {isGenerating ? <Badge variant="outline"><Loader2 className="size-3 animate-spin" />生成中</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {jd.resumeTitle ? `${jd.resumeTitle} · ` : ""}
                    {jd.pitchUpdatedAt ? `更新于 ${new Date(jd.pitchUpdatedAt).toLocaleString()}` : "尚未生成话术"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => props.openDetail(jd.id)}>
                    查看话术详情
                  </Button>
                  <Button size="sm" onClick={() => props.generatePitch(jd.id)} disabled={Boolean(isGenerating)}>
                    {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {jd.pitch ? "重新生成" : "生成话术"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }) : (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              还没有可生成话术的 JD。先去 JD 分析页完成一次匹配分析。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PitchCard(props: { title: string; items: string[] }) {
  return (
    <Card className="mb-4 break-inside-avoid">
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.items.map((item) => (
          <div key={item} className="rounded-md border bg-muted/30 p-3 text-sm leading-6">{item}</div>
        ))}
      </CardContent>
    </Card>
  );
}

function ThinkingText() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => setDots((current) => (current % 3) + 1), 450);
    return () => window.clearInterval(timer);
  }, []);

  return <span>正在思考{".".repeat(dots)}</span>;
}

function InterviewPanel(props: {
  closeDetail: () => void;
  detailJd?: JobDescriptionDraft;
  input: string;
  isInterviewLoading: boolean;
  isScoreLoading: boolean;
  jobDescriptions: JobDescriptionDraft[];
  messages: InterviewMessageDraft[];
  openDetail: (jdId: string) => void;
  scoreConversation: () => void;
  scoreMessage: (messageId: string) => void;
  scorePanel: { title: string; score: InterviewScore } | null;
  scoringMessageId: string;
  sendInterviewMessage: () => void;
  setInput: (value: string) => void;
}) {
  const hasUserAnswers = props.messages.some((message) => message.role === "user" && message.content.trim());

  if (!props.detailJd) {
    const analyzedJds = props.jobDescriptions.filter((jd) => jd.analysisStatus === "DONE" && jd.analysis);
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>模拟面试</CardTitle>
            <CardDescription>每场模拟面试绑定一条 JD 分析记录，方便围绕目标岗位连续追问和评分。</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-3">
          {analyzedJds.length ? analyzedJds.map((jd) => {
            const userAnswers = jd.interview?.messages.filter((message) => message.role === "user").length ?? 0;
            return (
              <Card key={jd.id}>
                <CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{jd.company} · {jd.role}</p>
                      <Badge variant="outline">匹配 {jd.analysis?.matchScore ?? 0}%</Badge>
                      {userAnswers ? <Badge variant="secondary">{userAnswers} 条回答</Badge> : <Badge variant="outline">未开始</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {jd.resumeTitle ? `${jd.resumeTitle} · ` : ""}
                      {jd.interview?.updatedAt ? `更新于 ${new Date(jd.interview.updatedAt).toLocaleString()}` : "从自我介绍开始模拟"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => props.openDetail(jd.id)}>
                    <MessageSquareText className="size-4" />
                    {userAnswers ? "继续模拟" : "开始模拟"}
                  </Button>
                </CardContent>
              </Card>
            );
          }) : (
            <Card>
              <CardContent className="py-10 text-sm text-muted-foreground">
                还没有可模拟的 JD。先去 JD 分析页完成一次匹配分析。
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card className="h-[680px] min-h-0">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Button className="mb-3" size="sm" variant="ghost" onClick={props.closeDetail}>
              <ArrowLeft className="size-4" />
              返回面试列表
            </Button>
            <CardTitle>AI 模拟面试官</CardTitle>
            <CardDescription>
              {props.detailJd.company} · {props.detailJd.role}。支持流式追问，没有配置模型 key 时会使用本地模拟回复。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex h-[520px] min-h-0 flex-col gap-4 pb-5">
          <ScrollArea className="min-h-0 flex-1 rounded-md border p-4">
            <div className="space-y-4">
              {props.messages.map((message) => (
                <div key={message.id} className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[82%] rounded-md border px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/45"}`}>
                    {message.content || (message.role === "assistant" ? <ThinkingText /> : null)}
                  </div>
                  {message.role === "user" && message.content.trim() ? (
                    <Button
                      className="mt-2 h-7 px-2 text-xs"
                      variant="outline"
                      onClick={() => props.scoreMessage(message.id)}
                      disabled={props.scoringMessageId === message.id}
                    >
                      {props.scoringMessageId === message.id ? <Loader2 className="size-3 animate-spin" /> : <ClipboardCheck className="size-3" />}
                      {message.score ? "查看评分" : "评分回答"}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="grid shrink-0 gap-2 pb-1">
            <Textarea className="max-h-28 min-h-20 resize-none" value={props.input} onChange={(event) => props.setInput(event.target.value)} placeholder="输入你的回答，面试官会继续追问..." />
            <div className="flex justify-between gap-2">
              {hasUserAnswers ? (
                <Button variant="outline" onClick={props.scoreConversation} disabled={props.isScoreLoading}>
                  {props.isScoreLoading ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
                  对当前面试整体评分
                </Button>
              ) : <span />}
              <Button onClick={props.sendInterviewMessage} disabled={props.isInterviewLoading}>
                {props.isInterviewLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                发送
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{props.scorePanel?.title ?? "回答评分"}</CardTitle>
          <CardDescription>结构、技术深度、业务影响、风险意识。</CardDescription>
        </CardHeader>
        <CardContent>
          {props.scorePanel ? (
            <div className="space-y-4">
              {[
                ["结构", props.scorePanel.score.structure],
                ["技术深度", props.scorePanel.score.technicalDepth],
                ["业务影响", props.scorePanel.score.businessImpact],
                ["风险意识", props.scorePanel.score.riskAwareness],
                ["总分", props.scorePanel.score.overall],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{value}</span></div>
                  <Progress value={Number(value)} />
                </div>
              ))}
              <Separator />
              {props.scorePanel.score.feedback.map((item) => <Insight key={item} text={item} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">发送回答后，可以对单条回答评分，也可以对当前面试整体评分。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApplicationPanel(props: {
  addApplication: () => void;
  applicationDraft: ApplicationDraft;
  applications: ApplicationDraft[];
  jobDescriptions: JobDescriptionDraft[];
  setApplicationDraft: (application: ApplicationDraft) => void;
  updateApplication: (id: string, patch: Partial<ApplicationDraft>) => void;
}) {
  const [editingApplications, setEditingApplications] = useState<Record<string, ApplicationDraft>>({});
  const [savedApplicationId, setSavedApplicationId] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedApplicationId, setExpandedApplicationId] = useState("");
  const [selectedJdPreview, setSelectedJdPreview] = useState<JobDescriptionDraft | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(20);
  const [filters, setFilters] = useState<{
    status: ApplicationStatus | "ALL";
    industry: string;
    priority: ApplicationPriority | "ALL";
    region: ApplicationRegion | "ALL";
  }>({
    status: "ALL",
    industry: "ALL",
    priority: "ALL",
    region: "ALL",
  });

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setEditingApplications((current) => {
        const next: Record<string, ApplicationDraft> = {};
        for (const application of props.applications) {
          next[application.id] = current[application.id] ?? application;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [props.applications]);

  function findJd(jdId: string) {
    return props.jobDescriptions.find((jd) => jd.id === jdId);
  }

  const filteredApplications = useMemo(
    () =>
      props.applications.filter((application) => {
        if (filters.status !== "ALL" && application.status !== filters.status) return false;
        if (filters.industry !== "ALL" && application.industry !== filters.industry) return false;
        if (filters.priority !== "ALL" && application.priority !== filters.priority) return false;
        if (filters.region !== "ALL" && application.region !== filters.region) return false;
        return true;
      }),
    [filters, props.applications],
  );
  const visibleApplications = filteredApplications.slice(0, visibleLimit);

  function updateApplicationDraft(id: string, patch: Partial<ApplicationDraft>) {
    setSavedApplicationId("");
    setEditingApplications((current) => {
      const currentDraft = current[id] ?? props.applications.find((application) => application.id === id);
      if (!currentDraft) return current;
      return {
        ...current,
        [id]: { ...currentDraft, ...patch },
      };
    });
  }

  function updateApplicationStatus(id: string, status: ApplicationStatus) {
    updateApplicationDraft(id, { status });
  }

  function updateInterviewRound(id: string, roundId: string, patch: Partial<InterviewRoundDraft>) {
    const draft = editingApplications[id] ?? props.applications.find((application) => application.id === id);
    if (!draft) return;
    updateApplicationDraft(id, {
      interviewRounds: draft.interviewRounds.map((round) => (round.id === roundId ? { ...round, ...patch } : round)),
    });
  }

  function addInterviewRound(id: string) {
    const draft = editingApplications[id] ?? props.applications.find((application) => application.id === id);
    if (!draft) return;
    updateApplicationDraft(id, {
      interviewRounds: [
        ...draft.interviewRounds,
        {
          id: crypto.randomUUID(),
          name: `加面 ${draft.interviewRounds.length + 1}`,
          status: "TODO",
          scheduledAt: "",
          notes: "",
        },
      ],
    });
  }

  function removeInterviewRound(id: string, roundId: string) {
    const draft = editingApplications[id] ?? props.applications.find((application) => application.id === id);
    if (!draft) return;
    updateApplicationDraft(id, {
      interviewRounds: draft.interviewRounds.filter((round) => round.id !== roundId),
    });
  }

  function saveApplicationDraft(id: string) {
    const draft = editingApplications[id];
    if (!draft) return;
    props.updateApplication(id, draft);
    setSavedApplicationId(id);
    window.setTimeout(() => setSavedApplicationId(""), 1800);
  }

  function selectDraftJd(jdId: string) {
    const jd = findJd(jdId);
    props.setApplicationDraft({
      ...props.applicationDraft,
      jdId,
      jdTitle: jd ? `${jd.company} · ${jd.role}` : "",
      company: props.applicationDraft.company || jd?.company || "",
      role: props.applicationDraft.role || jd?.role || "",
    });
  }

  function selectRowJd(applicationId: string, jdId: string) {
    const jd = findJd(jdId);
    updateApplicationDraft(applicationId, {
      jdId,
      jdTitle: jd ? `${jd.company} · ${jd.role}` : "",
      company: jd?.company || editingApplications[applicationId]?.company || "",
      role: jd?.role || editingApplications[applicationId]?.role || "",
    });
  }

  function createApplication() {
    if (!props.applicationDraft.company.trim() || !props.applicationDraft.role.trim()) return;
    props.addApplication();
    setIsCreateOpen(false);
  }

  function previewJd(jdId: string) {
    const jd = findJd(jdId);
    if (jd) setSelectedJdPreview(jd);
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle>投递筛选</CardTitle>
            <CardDescription>默认展示全部记录；海投场景下可以按状态、行业、优先级和地区快速收窄。</CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            新增投递
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 [&_[data-slot=select-trigger]]:w-full">
          <FilterSelect
            label="状态"
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value as ApplicationStatus | "ALL" }))}
            options={(Object.keys(statusLabels) as ApplicationStatus[]).map((status) => ({ value: status, label: statusLabels[status] }))}
          />
          <FilterSelect
            label="行业"
            value={filters.industry}
            onChange={(value) => setFilters((current) => ({ ...current, industry: value }))}
            options={industryOptions.map((industry) => ({ value: industry, label: industry }))}
          />
          <FilterSelect
            label="优先级"
            value={filters.priority}
            onChange={(value) => setFilters((current) => ({ ...current, priority: value as ApplicationPriority | "ALL" }))}
            options={priorityOptions.map((priority) => ({ value: priority, label: priority }))}
          />
          <FilterSelect
            label="地区"
            value={filters.region}
            onChange={(value) => setFilters((current) => ({ ...current, region: value as ApplicationRegion | "ALL" }))}
            options={regionOptions.map((region) => ({ value: region, label: region }))}
          />
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>新增投递</DialogTitle>
            <DialogDescription>一条投递记录对应一个岗位，可以手动关联已有 JD 分析。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="公司" value={props.applicationDraft.company} onChange={(value) => props.setApplicationDraft({ ...props.applicationDraft, company: value })} />
              <Field label="岗位" value={props.applicationDraft.role} onChange={(value) => props.setApplicationDraft({ ...props.applicationDraft, role: value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <IndustrySelect value={props.applicationDraft.industry} onChange={(industry) => props.setApplicationDraft({ ...props.applicationDraft, industry })} />
              <PrioritySelect value={props.applicationDraft.priority} onChange={(priority) => props.setApplicationDraft({ ...props.applicationDraft, priority })} />
              <RegionSelect value={props.applicationDraft.region} onChange={(region) => props.setApplicationDraft({ ...props.applicationDraft, region })} />
              <Field label="Base 城市" value={props.applicationDraft.city} onChange={(value) => props.setApplicationDraft({ ...props.applicationDraft, city: value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>状态</Label>
                <StatusSelect value={props.applicationDraft.status} onChange={(status) => props.setApplicationDraft({ ...props.applicationDraft, status })} />
              </div>
              <div className="grid gap-2">
                <Label>关联 JD 分析</Label>
                <Select value={props.applicationDraft.jdId || "none"} onValueChange={(value) => selectDraftJd(value === "none" ? "" : value)}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-4rem)] md:max-w-[640px]">
                    <SelectItem value="none">暂不关联</SelectItem>
                    {props.jobDescriptions.map((jd) => (
                      <SelectItem key={jd.id} value={jd.id}>
                        {jd.company} · {jd.role} · {jd.analysis?.matchScore ?? 0}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TextareaField label="备注" value={props.applicationDraft.notes} onChange={(notes) => props.setApplicationDraft({ ...props.applicationDraft, notes })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>取消</Button>
            <Button onClick={createApplication}><Plus className="size-4" />新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>投递看板</CardTitle>
          <CardDescription>共 {props.applications.length} 条，当前筛选 {filteredApplications.length} 条。默认折叠展示，展开后编辑详情。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {visibleApplications.length ? visibleApplications.map((application) => {
            const draft = editingApplications[application.id] ?? application;
            const linkedJd = findJd(draft.jdId);
            const isExpanded = expandedApplicationId === application.id;
            const finishedRounds = draft.interviewRounds.filter((round) => round.status === "DONE").length;
            return (
              <div key={application.id} className="grid gap-3 rounded-md border bg-card p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{draft.company || "公司待补充"}</p>
                      <Badge variant="secondary">{statusLabels[draft.status]}</Badge>
                      <span className={`inline-flex h-5 items-center rounded-4xl border px-2 text-xs font-medium ${priorityTone[draft.priority]}`}>
                        {draft.priority}
                      </span>
                      {draft.industry ? <Badge variant="outline">{draft.industry}</Badge> : null}
                      {draft.region ? <Badge variant="outline">{draft.region}{draft.city ? ` · ${draft.city}` : ""}</Badge> : null}
                      {linkedJd?.analysis ? <Badge variant="outline">匹配 {linkedJd.analysis.matchScore}%</Badge> : null}
                      {linkedJd?.analysis?.gaps.length ? <Badge variant="outline">缺口 {linkedJd.analysis.gaps.length}</Badge> : null}
                      {draft.interviewRounds.length ? <Badge variant="outline">面试 {finishedRounds}/{draft.interviewRounds.length}</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{draft.role || "岗位待补充"}</p>
                    {draft.notes ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{draft.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => previewJd(draft.jdId)} disabled={!draft.jdId}>
                      查看 JD
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setExpandedApplicationId(isExpanded ? "" : application.id)}>
                      {isExpanded ? "收起" : "展开"}
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="grid gap-3 border-t pt-3">
                    {savedApplicationId === application.id ? (
                      <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                        已保存这条投递记录。
                      </div>
                    ) : null}

                    <div className="grid gap-3 xl:grid-cols-[1fr_1fr_180px]">
                      <Field label="公司" value={draft.company} onChange={(value) => updateApplicationDraft(application.id, { company: value })} />
                      <Field label="岗位" value={draft.role} onChange={(value) => updateApplicationDraft(application.id, { role: value })} />
                      <div className="grid gap-2">
                        <Label>状态</Label>
                        <StatusSelect value={draft.status} onChange={(status) => updateApplicationStatus(application.id, status)} />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <IndustrySelect value={draft.industry} onChange={(industry) => updateApplicationDraft(application.id, { industry })} />
                      <PrioritySelect value={draft.priority} onChange={(priority) => updateApplicationDraft(application.id, { priority })} />
                      <RegionSelect value={draft.region} onChange={(region) => updateApplicationDraft(application.id, { region })} />
                      <Field label="Base 城市" value={draft.city} onChange={(city) => updateApplicationDraft(application.id, { city })} />
                    </div>

                    <div className="grid gap-2">
                      <Label>关联 JD</Label>
                      <Select value={draft.jdId || "none"} onValueChange={(value) => selectRowJd(application.id, value === "none" ? "" : value)}>
                        <SelectTrigger className="w-full min-w-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-w-[calc(100vw-4rem)] md:max-w-[720px]">
                          <SelectItem value="none">暂不关联</SelectItem>
                          {props.jobDescriptions.map((jd) => (
                            <SelectItem key={jd.id} value={jd.id}>
                              {jd.company} · {jd.role} · {jd.analysis?.matchScore ?? 0}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>面试轮次</Label>
                        <Button size="sm" variant="outline" onClick={() => addInterviewRound(application.id)}>
                          <Plus className="size-4" />
                          添加轮次
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {draft.interviewRounds.map((round) => (
                          <div key={round.id} className="grid gap-2 rounded-md border bg-muted/20 p-3 xl:grid-cols-[140px_140px_180px_1fr_auto]">
                            <Input value={round.name} onChange={(event) => updateInterviewRound(application.id, round.id, { name: event.target.value })} />
                            <Select value={round.status} onValueChange={(status) => updateInterviewRound(application.id, round.id, { status: status as InterviewRoundDraft["status"] })}>
                              <SelectTrigger className="w-full min-w-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TODO">待进行</SelectItem>
                                <SelectItem value="DONE">已完成</SelectItem>
                                <SelectItem value="SKIPPED">跳过</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input placeholder="时间" value={round.scheduledAt} onChange={(event) => updateInterviewRound(application.id, round.id, { scheduledAt: event.target.value })} />
                            <Input placeholder="问题、反馈、准备重点" value={round.notes} onChange={(event) => updateInterviewRound(application.id, round.id, { notes: event.target.value })} />
                            <Button size="icon-sm" variant="ghost" onClick={() => removeInterviewRound(application.id, round.id)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <TextareaField label="备注" value={draft.notes} onChange={(notes) => updateApplicationDraft(application.id, { notes })} />

                    {linkedJd?.analysis?.suggestions.length ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                        关联 JD 建议：{linkedJd.analysis.suggestions[0]}
                      </div>
                    ) : null}

                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => saveApplicationDraft(application.id)}>
                        <Save className="size-4" />
                        保存变更
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }) : <p className="py-8 text-sm text-muted-foreground">还没有投递记录。</p>}
          {filteredApplications.length > visibleApplications.length ? (
            <Button variant="outline" onClick={() => setVisibleLimit((current) => current + 20)}>
              加载更多
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedJdPreview)} onOpenChange={(open) => !open && setSelectedJdPreview(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] gap-5 p-6 xl:max-w-6xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{selectedJdPreview ? `${selectedJdPreview.company} · ${selectedJdPreview.role}` : "JD 分析"}</DialogTitle>
            <DialogDescription>在这里查看关联 JD，不打断当前 JD 分析页面的输入和分析状态。</DialogDescription>
          </DialogHeader>
          {selectedJdPreview ? (
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-2">
              {selectedJdPreview.analysis ? (
                <Tabs defaultValue="summary">
                  <TabsList>
                    <TabsTrigger value="summary">概览</TabsTrigger>
                    <TabsTrigger value="keywords">关键词</TabsTrigger>
                    <TabsTrigger value="actions">补强</TabsTrigger>
                  </TabsList>
                  <TabsContent value="summary" className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>匹配度</span>
                        <span className={metricTone(selectedJdPreview.analysis.matchScore)}>{selectedJdPreview.analysis.matchScore}%</span>
                      </div>
                      <Progress value={selectedJdPreview.analysis.matchScore} />
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedJdPreview.analysis.summary}</p>
                    {selectedJdPreview.analysis.strengths.map((item) => <Insight key={item} text={item} />)}
                  </TabsContent>
                  <TabsContent value="keywords" className="flex flex-wrap gap-2">
                    {selectedJdPreview.analysis.keywords.map((keyword) => <Badge key={keyword} variant="secondary">{keyword}</Badge>)}
                  </TabsContent>
                  <TabsContent value="actions" className="space-y-3">
                    {selectedJdPreview.analysis.gaps.map((gap) => <Badge key={gap} variant="outline">{gap}</Badge>)}
                    <Separator />
                    {selectedJdPreview.analysis.suggestions.map((suggestion) => <Insight key={suggestion} text={suggestion} />)}
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground">这条 JD 暂无完成的分析结果。</p>
              )}
              <Textarea className="min-h-72" readOnly value={selectedJdPreview.rawText} />
            </div>
          ) : null}
          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button variant="outline" onClick={() => setSelectedJdPreview(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <Select value={props.value} onValueChange={props.onChange}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">全部</SelectItem>
          {props.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function IndustrySelect(props: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>行业</Label>
      <Select value={props.value || "none"} onValueChange={(value) => props.onChange(value === "none" ? "" : value)}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">未设置</SelectItem>
          {industryOptions.map((industry) => (
            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PrioritySelect(props: { value: ApplicationPriority; onChange: (value: ApplicationPriority) => void }) {
  return (
    <div className="grid gap-2">
      <Label>优先级</Label>
      <Select value={props.value} onValueChange={(value) => props.onChange(value as ApplicationPriority)}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {priorityOptions.map((priority) => (
            <SelectItem key={priority} value={priority}>{priority}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RegionSelect(props: { value: ApplicationRegion; onChange: (value: ApplicationRegion) => void }) {
  return (
    <div className="grid gap-2">
      <Label>地区</Label>
      <Select value={props.value || "none"} onValueChange={(value) => props.onChange(value === "none" ? "" : value as ApplicationRegion)}>
        <SelectTrigger className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">未设置</SelectItem>
          {regionOptions.map((region) => (
            <SelectItem key={region} value={region}>{region}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatusSelect(props: { value: ApplicationStatus; onChange: (value: ApplicationStatus) => void }) {
  return (
    <Select value={props.value} onValueChange={(value) => props.onChange(value as ApplicationStatus)}>
      <SelectTrigger className="w-full min-w-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(statusLabels) as ApplicationStatus[]).map((status) => (
          <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
