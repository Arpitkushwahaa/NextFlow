import { task, logger } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

export interface LLMTaskPayload {
  model: string;
  systemPrompt?: string;
  userMessage: string;
  images?: string[]; // base64 data URLs or plain base64
  nodeRunId?: string;
}

export interface LLMTaskResult {
  text: string;
  nodeRunId?: string;
}

export const llmTask = task({
  id: "llm-task",
  maxDuration: 120,
  run: async (payload: LLMTaskPayload): Promise<LLMTaskResult> => {
    logger.log("LLM task started", { model: payload.model });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: payload.model || "gemini-1.5-flash",
      ...(payload.systemPrompt
        ? { systemInstruction: payload.systemPrompt }
        : {}),
    });

    const parts: Part[] = [];

    if (payload.images && payload.images.length > 0) {
      for (const image of payload.images) {
        if (!image) continue;
        let base64Data = image;
        let mimeType: string = "image/jpeg";

        if (image.startsWith("data:")) {
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          }
        }

        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          },
        });
      }
    }

    parts.push({ text: payload.userMessage });

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const text = result.response.text();

    logger.log("LLM task completed", { chars: text.length });
    return { text, nodeRunId: payload.nodeRunId };
  },
});
