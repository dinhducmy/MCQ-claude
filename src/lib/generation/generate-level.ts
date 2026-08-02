import type { AudienceValue, BloomLevel, DocChunk, MCQQuestion } from "@/lib/types";
import { buildGenerationPrompt } from "@/lib/generation/prompt";
import { extractJson, generateWithRetry } from "@/lib/generation/anthropic-client";
import { validateQuestionShape, toMCQQuestion } from "@/lib/generation/validate";
import { verifyCitation } from "@/lib/generation/verify-citation";
import {
  MAX_CITATION_RETRY_ROUNDS,
  MAX_QUESTIONS_PER_BATCH,
} from "@/lib/generation/constants";

export interface GenerateLevelParams {
  bloomLevel: BloomLevel;
  requestedCount: number;
  audience: AudienceValue;
  chunks: DocChunk[];
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
  chunks: DocChunk[],
  avoidStems: string[],
): Promise<MCQQuestion[]> {
  const { system, user } = buildGenerationPrompt({
    bloomLevel,
    count,
    audience,
    chunks,
    avoidStems,
  });

  const rawText = await generateWithRetry(system, user);

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

  const sourceText = sourceTextFor(chunks);
  const accepted: MCQQuestion[] = [];

  for (const rawQuestion of questionsRaw) {
    const shapeResult = validateQuestionShape(rawQuestion, bloomLevel);
    if (!shapeResult.ok) continue;

    const q = rawQuestion as { citation: { quote: string } };
    const citationResult = verifyCitation(q.citation.quote, sourceText);
    if (!citationResult.ok) continue;

    accepted.push(toMCQQuestion(rawQuestion, nextQuestionId(bloomLevel)));
  }

  return accepted;
}

export async function generateBloomLevelQuestions(
  params: GenerateLevelParams,
): Promise<GenerateLevelResult> {
  const { bloomLevel, requestedCount, audience, chunks, onProgress } = params;

  if (requestedCount <= 0 || chunks.length === 0) {
    return { questions: [], requested: requestedCount };
  }

  const accepted: MCQQuestion[] = [];
  onProgress?.(0, requestedCount);

  const batches = splitIntoBatches(requestedCount, MAX_QUESTIONS_PER_BATCH);
  for (const batchSize of batches) {
    const batchQuestions = await runOneGeneration(
      bloomLevel,
      batchSize,
      audience,
      chunks,
      accepted.map((q) => q.stem),
    );
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
      chunks,
      accepted.map((q) => q.stem),
    );
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
