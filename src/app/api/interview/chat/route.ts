import { getAiClient, getChatModel, shouldAllowServerAi, streamTextChunks } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = typeof body.context === "string" ? body.context : "";
  const aiConfig = typeof body.aiConfig === "object" && body.aiConfig ? body.aiConfig : undefined;
  const ai = getAiClient(aiConfig, { allowServerAi: shouldAllowServerAi(request) });

  if (!ai) {
    return new Response(
      streamTextChunks([
        "我先用本地模拟面试官模式追问你。\n\n",
        "刚才这段回答可以继续往下压实：你能不能用一个具体项目说明，",
        "当时的技术难点是什么、你做了哪些取舍、最后用什么指标证明结果？",
      ]),
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const stream = await ai.chat.completions.create({
    model: getChatModel(aiConfig),
    stream: true,
    temperature: 0.45,
    messages: [
      {
        role: "system",
        content:
          "你是严谨的技术面试官。用中文追问候选人，每次只问 1-2 个问题，关注项目真实性、技术深度、业务影响和风险意识。",
      },
      { role: "user", content: `候选人背景与目标岗位：\n${context}` },
      ...messages.map((message: { role: string; content: string }) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content || ""),
      })),
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const part of stream) {
        const text = part.choices[0]?.delta?.content;
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
