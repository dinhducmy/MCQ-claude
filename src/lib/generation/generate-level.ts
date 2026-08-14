import type { AudienceValue, BloomLevel, DocChunk, MCQQuestion } from "@/lib/types";
import { buildGenerationPrompt } from "@/lib/generation/prompt";
import { extractJson, generateWithRetry } from "@/lib/generation/anthropic-client";
import { validateQuestionShape, toMCQQuestion } from "@/lib/generation/validate";
import { verifyCitation } from "@/lib/generation/verify-citation";
import {
  MAX_CITATION_RETRY_ROUNDS,
  MAX_QUESTIONS_PER_BATCH,
} from "@/lib/generation/constants";
import {
  buildContextWindows,
  selectWindowForBatch,
} from "@/lib/generation/select-chunks";

export interface GenerateLevelParams {
  bloomLevel: BloomLevel;
  requestedCount: number;
  audience: AudienceValue;
  chunks: DocChunk[];
  /** Khóa API dùng cho lượt sinh này (của máy chủ hoặc của người dùng). */
  apiKey: string;
  avoidStems?: string[];
  /** Cửa sổ nội dung bắt đầu, để mỗi mức Bloom phủ phần khác nhau của tài liệu. */
  windowStartOffset?: number;
  onProgress?: (generated: number, requested: number) => void;
}

export interface GenerateLevelResult {
  questions: MCQQuestion[];
  requested: number;
  warning?: string;
}

function splitIntoBatches(total: number, batchSize: number): number[] {
  const batches: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    const size = Math.min(batchSize, remaining);
    batches.push(size);
    remaining -= size;
  }
  return batches;
}

function sourceTextFor(chunks: DocChunk[]): string {
  return chunks.map((c) => c.text).join(" \n ");
}

let questionIdCounter = 0;
function nextQuestionId(bloomLevel: BloomLevel): string {
  questionIdCounter += 1;
  return `q-${bloomLevel}-${Date.now()}-${questionIdCounter}`;
}

async function runOneGeneration(
  bloomLevel: BloomLevel,
  count: number,
  audience: AudienceValue,
  promptChunks: DocChunk[],
  verificationText: string,
  avoidStems: string[],
  apiKey: string,
): Promise<MCQQuestion[]> {
  const { system, user } = buildGenerationPrompt({
    bloomLevel,
    count,
    audience,
    chunks: promptChunks,
    avoidStems,
  });

  const rawText = await generateWithRetry(system, user, apiKey);

  let parsed: unknown;
  try {
    parsed = extractJson(rawText);
  } catch {
    return [];
  }

  const questionsRaw =
    parsed && typeof parsed === "object" && "questions" in parsed
      ? (parsed as { questions: unknown }).questions
      : parsed;

  if (!Array.isArray(questionsRaw)) {
    return [];
  }

  const accepted: MCQQuestion[] = [];

  for (const rawQuestion of questionsRaw) {
    const shapeResult = validateQuestionShape(rawQuestion, bloomLevel);
    if (!shapeResult.ok) continue;

    const q = rawQuestion as { citation: { quote: string } };
    const citationResult = verifyCitation(q.citation.quote, verificationText);
    if (!citationResult.ok) continue;

    accepted.push(toMCQQuestion(rawQuestion, nextQuestionId(bloomLevel)));
  }

  return accepted;
}

export async function generateBloomLevelQuestions(
  params: GenerateLevelParams,
): Promise<GenerateLevelResult> {
  const {
    bloomLevel,
    requestedCount,
    audience,
    chunks,
    apiKey,
    avoidStems: seedAvoidStems,
    windowStartOffset = 0,
    onProgress,
  } = params;

  if (requestedCount <= 0 || chunks.length === 0) {
    return { questions: [], requested: requestedCount };
  }

  const accepted: MCQQuestion[] = [];
  const priorStems = seedAvoidStems ?? [];
  onProgress?.(0, requestedCount);

  // Tài liệu lớn được chia thành nhiều cửa sổ; mỗi lô chỉ nhận một cửa sổ
  // để không vượt giới hạn token, và luân phiên để phủ đều tài liệu.
  const windows = buildContextWindows(chunks);
  const verificationText = sourceTextFor(chunks);
  let windowCursor = windowStartOffset;

  const batches = splitIntoBatches(requestedCount, MAX_QUESTIONS_PER_BATCH);
  for (const batchSize of batches) {
    const batchQuestions = await runOneGeneration(
      bloomLevel,
      batchSize,
      audience,
      selectWindowForBatch(windows, windowCursor),
      verificationText,
      [...priorStems, ...accepted.map((q) => q.stem)],
      apiKey,
    );
    windowCursor += 1;
    accepted.push(...batchQuestions);
    onProgress?.(Math.min(accepted.length, requestedCount), requestedCount);
  }

  let retryRound = 0;
  while (accepted.length < requestedCount && retryRound < MAX_CITATION_RETRY_ROUNDS) {
    retryRound += 1;
    const shortfall = requestedCount - accepted.length;
    const retryQuestions = await runOneGeneration(
      bloomLevel,
      Math.min(shortfall, MAX_QUESTIONS_PER_BATCH),
      audience,
      selectWindowForBatch(windows, windowCursor),
      verificationText,
      [...priorStems, ...accepted.map((q) => q.stem)],
      apiKey,
    );
    windowCursor += 1;
    accepted.push(...retryQuestions);
    onProgress?.(Math.min(accepted.length, requestedCount), requestedCount);
  }

  const finalQuestions = accepted.slice(0, requestedCount);
  const result: GenerateLevelResult = {
    questions: finalQuestions,
    requested: requestedCount,
  };

  if (finalQuestions.length < requestedCount) {
    result.warning = `Chỉ sinh được ${finalQuestions.length}/${requestedCount} câu mức "${bloomLevel}" — tài liệu có thể không đủ nội dung phù hợp. Hệ thống không bù bằng câu tự bịa.`;
  }

  return result;
}
