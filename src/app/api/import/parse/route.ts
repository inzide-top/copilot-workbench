import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/ai";
import { parseJdFallback, parseResumeFallback } from "@/lib/import-parsers";

const RequestSchema = z.object({
  kind: z.enum(["resume", "jd"]),
  text: z.string().min(2),
  aiConfig: z
    .object({
      apiKey: z.string().default(""),
      baseUrl: z.string().default(""),
      model: z.string().default(""),
    })
    .optional(),
});

const ResumeSchema = z.object({
  name: z.string().default(""),
  headline: z.string().default(""),
  location: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  summary: z.string().default(""),
  resumeText: z.string().default(""),
  projects: z
    .array(
      z.object({
        id: z.string().default(""),
        title: z.string().default(""),
        role: z.string().default(""),
        stack: z.string().default(""),
        challenge: z.string().default(""),
        actions: z.string().default(""),
        impact: z.string().default(""),
        talkingPoints: z.string().default(""),
      }),
    )
    .default([]),
});
const ResumeAiSchema = ResumeSchema.omit({ resumeText: true });

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "导入文本为空或格式不正确。" }, { status: 400 });
  }

  if (parsed.data.kind === "resume") {
    const fallback = parseResumeFallback(parsed.data.text);
    const shouldAskAi =
      Boolean(parsed.data.aiConfig?.apiKey?.trim()) &&
      (!fallback.name || !fallback.headline || fallback.projects.length === 0);
    const output = shouldAskAi
      ? await generateJson({
          fallback: {
            name: fallback.name,
            headline: fallback.headline,
            location: fallback.location,
            email: fallback.email,
            phone: fallback.phone,
            summary: fallback.summary,
            projects: fallback.projects,
          },
          schema: ResumeAiSchema,
          aiConfig: parsed.data.aiConfig,
          maxTokens: 1800,
          timeoutMs: 12000,
          system:
            "你是简历信息抽取助手。请从 OCR/文档文本中提取候选人的姓名、求职定位、城市、邮箱、电话、个人摘要、多个项目经历。",
          prompt: JSON.stringify({
            task: "抽取简历字段。姓名通常在简历顶部，可能没有“姓名：”标签。项目经历可以有多个，映射为 title, role, stack, challenge(背景), actions(个人贡献), impact(成果)。不要返回完整简历正文。无法确定的字段返回空字符串，不要编造。",
            text: parsed.data.text.slice(0, 12000),
          }),
        })
      : fallback;

    return NextResponse.json({
      ...output,
      resumeText: fallback.resumeText || parsed.data.text,
      projects: output.projects.map((project) => ({
        ...project,
        id: project.id || crypto.randomUUID(),
        talkingPoints: "",
      })),
    });
  }

  const output = parseJdFallback(parsed.data.text);

  return NextResponse.json({
    ...output,
    companyMissing: !output.company,
    rawText: output.rawText || parsed.data.text,
  });
}
