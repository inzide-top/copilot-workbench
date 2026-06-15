import OpenAI from "openai";
import { z } from "zod";
import type { AiConfigDraft } from "@/lib/types";

let client: OpenAI | null = null;

export function getAiClient(config?: Partial<AiConfigDraft>) {
  if (config?.apiKey?.trim()) {
    return new OpenAI({
      apiKey: config.apiKey.trim(),
      baseURL: config.baseUrl?.trim() || undefined,
    });
  }

  if (!process.env.OPENAI_API_KEY) return null;

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }

  return client;
}

export function getChatModel(config?: Partial<AiConfigDraft>) {
  return config?.model?.trim() || process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export async function generateJson<T>(params: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  fallback: T;
  aiConfig?: Partial<AiConfigDraft>;
  maxTokens?: number;
  timeoutMs?: number;
}) {
  const ai = getAiClient(params.aiConfig);
  if (!ai) return params.fallback;

  const timeoutMs = params.timeoutMs;
  const controller = timeoutMs ? new AbortController() : null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  if (controller && timeoutMs) {
    timeout = windowlessSetTimeout(() => controller.abort(), timeoutMs);
  }

  let response;
  try {
    response = await ai.chat.completions.create(
      {
        model: getChatModel(params.aiConfig),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${params.system}\n只返回 JSON，不要 Markdown。` },
          { role: "user", content: params.prompt },
        ],
        temperature: 0.3,
        max_tokens: params.maxTokens,
      },
      controller ? { signal: controller.signal } : undefined,
    );
  } catch (error) {
    if (params.timeoutMs) return params.fallback;
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  const content = response.choices[0]?.message.content;
  if (!content) return params.fallback;

  try {
    return params.schema.parse(JSON.parse(content));
  } catch {
    return params.fallback;
  }
}

function windowlessSetTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

export function streamTextChunks(chunks: string[]) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 70));
      }
      controller.close();
    },
  });
}
