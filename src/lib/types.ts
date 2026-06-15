export type ProfileDraft = {
  name: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  summary: string;
  resumeText: string;
};

export type ProjectDraft = {
  id: string;
  title: string;
  role: string;
  stack: string;
  challenge: string;
  actions: string;
  impact: string;
  talkingPoints: string;
};

export type ResumeDraft = {
  id: string;
  title: string;
  targetRole: string;
  profile: ProfileDraft;
  projects: ProjectDraft[];
  createdAt: string;
  updatedAt: string;
};

export type AiConfigDraft = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type JdAnalysis = {
  matchScore: number;
  keywords: string[];
  gaps: string[];
  strengths: string[];
  suggestions: string[];
  summary: string;
};

export type PitchOutput = {
  intro: string;
  resumeBullets: string[];
  projectTalkTrack: string[];
  riskNotes: string[];
};

export type InterviewScore = {
  structure: number;
  technicalDepth: number;
  businessImpact: number;
  riskAwareness: number;
  overall: number;
  feedback: string[];
};

export type InterviewMessageDraft = {
  id: string;
  role: "user" | "assistant";
  content: string;
  score?: InterviewScore;
};

export type InterviewConversationScoreCache = {
  signature: string;
  score: InterviewScore;
};

export type InterviewSessionDraft = {
  messages: InterviewMessageDraft[];
  conversationScoreCache?: InterviewConversationScoreCache;
  updatedAt: string;
};

export type JobDescriptionDraft = {
  id: string;
  company: string;
  role: string;
  rawText: string;
  resumeId?: string;
  resumeTitle?: string;
  analysis?: JdAnalysis;
  analysisStatus?: "ANALYZING" | "DONE" | "FAILED";
  pitch?: PitchOutput;
  pitchStatus?: "GENERATING" | "DONE" | "FAILED";
  pitchUpdatedAt?: string;
  interview?: InterviewSessionDraft;
  createdAt: string;
};

export type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "INTERVIEWING"
  | "OFFER"
  | "REJECTED"
  | "ARCHIVED";

export type ApplicationPriority = "S" | "A" | "B" | "C" | "D";
export type ApplicationRegion = "" | "华东" | "华南" | "华北" | "华中" | "西南";

export type InterviewRoundDraft = {
  id: string;
  name: string;
  status: "TODO" | "DONE" | "SKIPPED";
  scheduledAt: string;
  notes: string;
};

export type ApplicationDraft = {
  id: string;
  company: string;
  role: string;
  jdId: string;
  jdTitle: string;
  industry: string;
  priority: ApplicationPriority;
  region: ApplicationRegion;
  city: string;
  status: ApplicationStatus;
  notes: string;
  retrospective: string;
  statusReviews: Partial<Record<ApplicationStatus, string>>;
  interviewRounds: InterviewRoundDraft[];
  updatedAt: string;
};

export type WorkspaceSnapshot = {
  profile: ProfileDraft;
  projects: ProjectDraft[];
  resumes?: ResumeDraft[];
  activeResumeId?: string;
  jobDescriptions: JobDescriptionDraft[];
  applications: ApplicationDraft[];
};
