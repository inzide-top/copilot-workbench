"use client";

import { useEffect, useMemo, useState } from "react";
import { extractTextFromFile } from "@/lib/document-import";
import { parseJdFallback } from "@/lib/import-parsers";
import type {
  ApplicationDraft,
  InterviewConversationScoreCache,
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
import { ApplicationPanel } from "./application-panel";
import {
  aiConfigStorageKey,
  aiProviderOptions,
  defaultAiConfig,
  defaultProfile,
  defaultResumeId,
  demoAiConfig,
  demoJdPath,
  demoResumePath,
  starterInterviewMessage,
  storageKey,
} from "./constants";
import {
  createResume,
  defaultResume,
  emptyProject,
  latestJd,
  loadPublicExampleFile,
  newApplication,
  normalizeApplication,
  normalizeJobDescription,
  normalizeResume,
  parseImportedText,
  snapshotHasData,
  type JdImportFields,
  type ResumeImportFields,
} from "./helpers";
import { InterviewPanel } from "./interview-panel";
import { JdPanel } from "./jd-panel";
import { OverviewPanel } from "./overview-panel";
import { PitchPanel } from "./pitch-panel";
import { ProfileProjectsPanel } from "./profile-projects-panel";
import { SettingsPanel } from "./settings-panel";
import { WorkbenchChrome } from "./workbench-chrome";
import type { Section } from "./workbench-types";

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
    <WorkbenchChrome
      activeSection={activeSection}
      isSaving={isLoading === "save"}
      newResumeDialogOpen={newResumeDialogOpen}
      pendingProjectsDialogOpen={pendingProjectsDialogOpen}
      performAddResume={performAddResume}
      performSaveCurrentResume={performSaveCurrentResume}
      pitchToast={pitchToast}
      resumeToast={resumeToast}
      saveState={saveState}
      saveToDatabase={saveToDatabase}
      setActiveSection={setActiveSection}
      setNewResumeDialogOpen={setNewResumeDialogOpen}
      setPendingProjectsDialogOpen={setPendingProjectsDialogOpen}
      setPitchToast={setPitchToast}
      openPitchDetail={openPitchDetail}
    >
            {activeSection === "overview" && (
              <OverviewPanel
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
              <ProfileProjectsPanel
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
    </WorkbenchChrome>
  );
}
