import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJson } from "@/lib/ai";
import { scoreFallback } from "@/lib/fallbacks";

const RequestSchema = z.object({
  answer: z.string().min(10),
  context: z.string().default(""),
  aiConfig: z
    .object({
      apiKey: z.string().default(""),
      baseUrl: z.string().default(""),
      model: z.string().default(""),
    })
    .optional(),
});

const ScoreSchema = z.object({
  structure: z.number().min(0).max(100),
  technicalDepth: z.number().min(0).max(100),
  businessImpact: z.number().min(0).max(100),
  riskAwareness: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  feedback: z.array(z.string()),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请先输入一段完整回答。" }, { status: 400 });
  }

  const fallback = scoreFallback(parsed.data.answer);
  const output = await generateJson({
    fallback,
    schema: ScoreSchema,
    aiConfig: parsed.data.aiConfig,
    system: "你是严格但建设性的技术面试官，按结构、技术深度、业务影响、风险意识评分。",
    prompt: JSON.stringify({
      task: "为候选人的面试回答打分，给出四个维度、总分和可行动反馈。",
      ...parsed.data,
    }),
  });

  return NextResponse.json(output);
}
