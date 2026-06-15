import {
  defaultProfile,
  defaultResumeId,
  interviewRoundTemplates,
} from "./constants";
import type {
  AiConfigDraft,
  ApplicationDraft,
  InterviewRoundDraft,
  JobDescriptionDraft,
  ProfileDraft,
  ProjectDraft,
  ResumeDraft,
  WorkspaceSnapshot,
} from "@/lib/types";

export type ResumeImportFields = Partial<ProfileDraft> & {
  projects?: ProjectDraft[];
};

export type JdImportFields = {
  company: string;
  role: string;
  rawText: string;
  companyMissing: boolean;
};

export function metricTone(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 65) return "text-amber-300";
  return "text-rose-300";
}

export function emptyProject(): ProjectDraft {
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

export function createResume(params?: {
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

export function defaultResume(): ResumeDraft {
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

export function normalizeResume(resume: Partial<ResumeDraft>, fallback?: Partial<WorkspaceSnapshot>): ResumeDraft {
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

export function defaultInterviewRounds(): InterviewRoundDraft[] {
  return interviewRoundTemplates.slice(0, 1).map((name) => ({
    id: crypto.randomUUID(),
    name,
    status: "TODO",
    scheduledAt: "",
    notes: "",
  }));
}

export function newApplication(): ApplicationDraft {
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

export function normalizeApplication(application: Partial<ApplicationDraft>): ApplicationDraft {
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

export function normalizeJobDescription(jd: Partial<JobDescriptionDraft>): JobDescriptionDraft {
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

export function snapshotHasData(snapshot: WorkspaceSnapshot | null | undefined) {
  return Boolean(
    snapshot &&
      ((snapshot.resumes?.length ?? 0) > 0 ||
        (snapshot.jobDescriptions?.length ?? 0) > 0 ||
        (snapshot.applications?.length ?? 0) > 0),
  );
}

export function latestJd(jobDescriptions: JobDescriptionDraft[]) {
  return jobDescriptions[0];
}

export async function parseImportedText<T>(kind: "resume" | "jd", text: string, aiConfig: AiConfigDraft) {
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

export async function loadPublicExampleFile(path: string, fileName: string, fallbackType: string) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error("示例文件加载失败，请稍后重试。");
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || fallbackType });
}
