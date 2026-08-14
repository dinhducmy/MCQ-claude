import Anthropic from "@anthropic-ai/sdk";

import {
  CLAUDE_MODEL,
  MAX_TOKENS_PER_BATCH,
  MAX_TRANSPORT_RETRIES,
  TRANSPORT_RETRY_BASE_DELAY_MS,
} from "@/lib/generation/constants";

/**
 * Mỗi khóa API dùng một client riêng (khóa của máy chủ hoặc khóa người dùng
 * tự nhập). Bộ nhớ đệm được xóa khi quá lớn để một tiến trình phục vụ nhiều
 * người dùng không tích tụ client vô hạn.
 */
const MAX_CACHED_CLIENTS = 8;
const clientCache = new Map<string, Anthropic>();

function getClient(apiKey: string): Anthropic {
  if (!apiKey) {
    throw new Error(
      "Thiếu khóa API Anthropic. Vui lòng cấu hình ANTHROPIC_API_KEY hoặc nhập khóa trên giao diện.",
    );
  }
  const cached = clientCache.get(apiKey);
  if (cached) return cached;

  if (clientCache.size >= MAX_CACHED_CLIENTS) clientCache.clear();
  const client = new Anthropic({ apiKey });
  clientCache.set(apiKey, client);
  return client;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.InternalServerError) return true;
  if (err instanceof Anthropic.APIConnectionError) return true;
  return false;
}

/**
 * Gọi Claude với retry + exponential backoff cho lỗi timeout/429/5xx.
 * Lỗi không thể retry (400, 401, ...) sẽ ném ngay lập tức.
 */
export async function generateWithRetry(
  system: string,
  user: string,
  apiKey: string,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_TRANSPORT_RETRIES; attempt++) {
    try {
      const response = await getClient(apiKey).messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS_PER_BATCH,
        system,
        messages: [{ role: "user", content: user }],
      });

      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      if (!textBlock) {
        throw new Error("Phản hồi từ model không chứa nội dung văn bản.");
      }
      return textBlock.text;
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === MAX_TRANSPORT_RETRIES - 1) {
        throw err;
      }
      const delay = TRANSPORT_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Bóc JSON thuần từ phản hồi model, phòng trường hợp model vẫn kèm
 * markdown code fence hoặc lời dẫn dù đã yêu cầu không làm vậy.
 */
export function extractJson(text: string): unknown {
  let candidate = text.trim();

  const fenceMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    candidate = fenceMatch[1].trim();
  }

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidate = candidate.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(candidate);
}
