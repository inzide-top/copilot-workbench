import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeJdFallback, extractCoreJdForMatching } from "@/lib/fallbacks";
import { generateJson } from "@/lib/ai";

const RequestSchema = z.object({
  jd: z.string().min(20),
  profile: z.any(),
  projects: z.array(z.any()).default([]),
  aiConfig: z
    .object({
      apiKey: z.string().default(""),
      baseUrl: z.string().default(""),
      model: z.string().default(""),
    })
    .optional(),
});

const AnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  keywords: z.array(z.string()),
  gaps: z.array(z.string()),
  strengths: z.array(z.string()),
  suggestions: z.array(z.string()),
  summary: z.string(),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请粘贴更完整的 JD 内容。" }, { status: 400 });
  }

  const fallback = analyzeJdFallback(parsed.data);
  const coreJd = extractCoreJdForMatching(parsed.data.jd);
  const output = await generateJson({
    fallback,
    schema: AnalysisSchema,
    aiConfig: parsed.data.aiConfig,
    system:
      "你是资深求职教练和技术面试官。分析匹配度时只能依据岗位职责、工作内容、任职要求、岗位要求、任职资格、加分项。必须忽略公司介绍、团队介绍、团队阶段、企业文化、福利待遇、招聘流程、工作地点、宣传口号等噪声。",
    prompt: JSON.stringify({
      task: "分析候选人资料和核心 JD 的匹配度。keywords 只输出职责/要求里的技术、经验、业务能力关键词；gaps 只输出候选人简历中缺少的岗位硬要求或关键职责证据；不要把“团队刚刚起步”“氛围好”“快速发展”等背景描述作为缺口或关键词。返回 matchScore, keywords, gaps, strengths, suggestions, summary。",
      jd: coreJd,
      originalJd: parsed.data.jd,
      profile: parsed.data.profile,
      projects: parsed.data.projects,
    }),
  });

  return NextResponse.json(output);
}
