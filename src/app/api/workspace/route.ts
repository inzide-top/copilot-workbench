import { NextResponse } from "next/server";
import { hasDatabaseUrl, getPrisma } from "@/lib/db";

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : value;
}

function canUseWorkspaceDatabase(request: Request) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  return host.startsWith("copilot-interview.") || host === "localhost" || host === "127.0.0.1";
}

export async function GET(request: Request) {
  if (!canUseWorkspaceDatabase(request)) {
    return NextResponse.json({ databaseConfigured: false, snapshot: null });
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ databaseConfigured: false, snapshot: null });
  }

  const prisma = getPrisma();
  const [profile, projects, resumes, jobDescriptions, applications] = await Promise.all([
    prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.project.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.resume.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.jobDescription.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.application.findMany({ orderBy: { updatedAt: "desc" } }),
  ]);

  return NextResponse.json({
    databaseConfigured: true,
    snapshot: {
      profile: profile
        ? {
            name: profile.name,
            headline: profile.headline,
            location: profile.location,
            email: profile.email,
            phone: profile.phone,
            summary: profile.summary,
            resumeText: profile.resumeText,
          }
        : null,
      projects: projects.map((project) => ({
        id: project.id,
        title: project.title,
        role: project.role,
        stack: project.stack.join("、"),
        challenge: project.challenge,
        actions: project.actions,
        impact: project.impact,
        talkingPoints: project.talkingPoints,
      })),
      resumes: resumes.map((resume) => ({
        id: resume.id,
        title: resume.title,
        targetRole: resume.targetRole,
        profile: {
          name: resume.name,
          headline: resume.headline,
          location: resume.location,
          email: resume.email,
          phone: resume.phone,
          summary: resume.summary,
          resumeText: resume.resumeText,
        },
        projects: Array.isArray(resume.projects) ? resume.projects : [],
        createdAt: toIsoString(resume.createdAt),
        updatedAt: toIsoString(resume.updatedAt),
      })),
      jobDescriptions: jobDescriptions.map((jd) => ({
        id: jd.id,
        company: jd.company,
        role: jd.role,
        rawText: jd.rawText,
        resumeId: jd.resumeId || "",
        resumeTitle: jd.resumeTitle || "",
        analysis: jd.analysis,
        analysisStatus: jd.analysisStatus,
        pitch: jd.pitch,
        pitchStatus: jd.pitchStatus || undefined,
        pitchUpdatedAt: toIsoString(jd.pitchUpdatedAt),
        interview: jd.interview,
        createdAt: toIsoString(jd.createdAt),
      })),
      applications: applications.map((application) => ({
        id: application.id,
        company: application.company,
        role: application.role,
        status: application.status,
        jdId: application.jobDescriptionId || "",
        jdTitle: "",
        industry: application.industry || "",
        priority: application.priority || "B",
        region: application.region || "",
        city: application.city || "",
        notes: application.notes || "",
        retrospective: application.retrospective || "",
        statusReviews: application.statusReviews && typeof application.statusReviews === "object" ? application.statusReviews : {},
        interviewRounds: Array.isArray(application.interviewRounds) ? application.interviewRounds : [],
        updatedAt: toIsoString(application.updatedAt),
      })),
    },
  });
}

export async function POST(request: Request) {
  if (!canUseWorkspaceDatabase(request)) {
    return NextResponse.json({
      databaseConfigured: false,
      saved: false,
      message: "当前站点仅使用浏览器本地持久化。",
    });
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.json({
      databaseConfigured: false,
      saved: false,
      message: "DATABASE_URL 未配置，当前使用浏览器本地持久化。",
    });
  }

  const snapshot = await request.json();
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.interviewMessage.deleteMany();
    await tx.interviewSession.deleteMany();
    await tx.application.deleteMany();
    await tx.jobDescription.deleteMany();
    await tx.profile.deleteMany();
    await tx.resume.deleteMany();
    await tx.project.deleteMany();

    if (snapshot.profile) {
      await tx.profile.create({ data: snapshot.profile });
    }

    if (Array.isArray(snapshot.resumes)) {
      for (const resume of snapshot.resumes) {
        await tx.resume.create({
          data: {
            id: resume.id,
            title: resume.title || "未命名简历",
            targetRole: resume.targetRole || "",
            name: resume.profile?.name || "",
            headline: resume.profile?.headline || "",
            location: resume.profile?.location || "",
            email: resume.profile?.email || "",
            phone: resume.profile?.phone || "",
            summary: resume.profile?.summary || "",
            resumeText: resume.profile?.resumeText || "",
            projects: resume.projects || [],
          },
        });
      }
    }

    if (Array.isArray(snapshot.projects)) {
      for (const project of snapshot.projects) {
        await tx.project.create({
          data: {
            title: project.title || "未命名项目",
            role: project.role || "",
            stack: String(project.stack || "")
              .split(/[,\s，、]+/)
              .filter(Boolean),
            challenge: project.challenge || "",
            actions: project.actions || "",
            impact: project.impact || "",
            talkingPoints: project.talkingPoints || "",
          },
        });
      }
    }

    if (Array.isArray(snapshot.jobDescriptions)) {
      for (const jd of snapshot.jobDescriptions) {
        await tx.jobDescription.create({
          data: {
            id: jd.id,
            company: jd.company || "目标公司",
            role: jd.role || "目标岗位",
            rawText: jd.rawText || "",
            resumeId: jd.resumeId || null,
            resumeTitle: jd.resumeTitle || null,
            keywords: jd.analysis?.keywords || [],
            gaps: jd.analysis?.gaps || [],
            matchScore: jd.analysis?.matchScore,
            analysis: jd.analysis || undefined,
            analysisStatus: jd.analysisStatus || (jd.analysis ? "DONE" : "FAILED"),
            pitch: jd.pitch || undefined,
            pitchStatus: jd.pitchStatus || "",
            pitchUpdatedAt: jd.pitchUpdatedAt ? new Date(jd.pitchUpdatedAt) : null,
            interview: jd.interview || undefined,
            createdAt: jd.createdAt ? new Date(jd.createdAt) : undefined,
          },
        });
      }
    }

    if (Array.isArray(snapshot.applications)) {
      for (const application of snapshot.applications) {
        await tx.application.create({
          data: {
            id: application.id,
            company: application.company || "目标公司",
            role: application.role || "目标岗位",
            status: application.status || "SAVED",
            jobDescriptionId: application.jdId || null,
            industry: application.industry || "",
            priority: application.priority || "B",
            region: application.region || "",
            city: application.city || "",
            notes: application.notes || "",
            retrospective: application.retrospective || "",
            statusReviews: application.statusReviews || {},
            nextAction: "",
            interviewRounds: application.interviewRounds || [],
            updatedAt: application.updatedAt ? new Date(application.updatedAt) : undefined,
          },
        });
      }
    }
  });

  return NextResponse.json({ databaseConfigured: true, saved: true });
}
