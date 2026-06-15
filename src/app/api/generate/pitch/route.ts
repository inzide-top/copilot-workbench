import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson, shouldAllowServerAi } from "@/lib/ai";
import { pitchFallback } from "@/lib/fallbacks";

const RequestSchema = z.object({
  profile: z.any(),
  projects: z.array(z.any()).default([]),
  jdCompany: z.string().default("目标公司"),
  jdRole: z.string().default("目标岗位"),
  jdText: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  aiConfig: z
    .object({
      apiKey: z.string().default(""),
      baseUrl: z.string().default(""),
      model: z.string().default(""),
    })
    .optional(),
});

const PitchSchema = z.object({
  intro: z.string(),
  resumeBullets: z.array(z.string()),
  projectTalkTrack: z.array(z.string()),
  riskNotes: z.array(z.string()),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "生成参数不完整。" }, { status: 400 });
  }

  const fallback = pitchFallback(parsed.data);
  const output = await generateJson({
    fallback,
    schema: PitchSchema,
    aiConfig: parsed.data.aiConfig,
    allowServerAi: shouldAllowServerAi(request),
    maxTokens: 1800,
    timeoutMs: 16000,
    system:
      "你是资深技术面试表达教练。你的输出必须是候选人可以直接复制、修改后用于面试或简历的中文成稿，不能写成提示词、任务说明、模板占位或建议清单。",
    prompt: JSON.stringify({
      task:
        "根据候选人资料和目标 JD 生成定制面试材料。intro 必须是一段 60-90 秒的一人称自我介绍，开头自然，不要出现“请生成”“可以这样说”“以下是”等元话语。resumeBullets 每条必须是可放进简历的成就 bullet，使用动词开头，包含技术动作和业务/效率结果。projectTalkTrack 每条必须是项目面试讲法，按背景、我的职责、关键方案、结果、可追问点组织。riskNotes 必须是面试官可能追问的问题和候选人的回答方向，不要泛泛而谈。",
      ...parsed.data,
    }),
  });

  return NextResponse.json(output);
}
