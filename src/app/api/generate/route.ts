import { NextRequest } from "next/server";

import {
  BLOOM_LEVELS,
  MAX_TOTAL_QUESTIONS,
  type AudienceValue,
  type BloomCounts,
  type BloomLevel,
  type DocChunk,
  type MCQQuestion,
} from "@/lib/types";
import { generateBloomLevelQuestions } from "@/lib/generation/generate-level";

export const runtime = "nodejs";
export const maxDuration = 300;

interface GenerateRequestBody {
  chunks: DocChunk[];
  counts: BloomCounts;
  audience: AudienceValue;
  scopeMode: "all" | "sections";
  selectedSectionTitles?: string[];
}

type StreamEvent =
  | {
      type: "progress";
      bloomLevel: BloomLevel;
      generated: number;
      requested: number;
    }
  | { type: "level_done"; bloomLevel: BloomLevel; questions: MCQQuestion[] }
  | { type: "warning"; bloomLevel: BloomLevel; message: string }
  | { type: "error"; message: string }
  | { type: "complete" };

function filterChunksByScope(
  chunks: DocChunk[],
  scopeMode: "all" | "sections",
  selectedSectionTitles: string[] | undefined,
): DocChunk[] {
  if (scopeMode === "all" || !selectedSectionTitles?.length) {
    return chunks;
  }
  const selectedSet = new Set(selectedSectionTitles);
  return chunks.filter((chunk) =>
    chunk.headingPath.some((heading) => selectedSet.has(heading)),
  );
}

function validateBody(body: unknown): body is GenerateRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.chunks)) return false;
  if (typeof b.counts !== "object" || b.counts === null) return false;
  if (typeof b.audience !== "string") return false;
  if (b.scopeMode !== "all" && b.scopeMode !== "sections") return false;
  return true;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Dữ liệu yêu cầu không hợp lệ (không phải JSON)." }),
      { status: 400 },
    );
  }

  if (!validateBody(body)) {
    return new Response(
      JSON.stringify({ error: "Thiếu hoặc sai định dạng dữ liệu yêu cầu." }),
      { status: 400 },
    );
  }

  const totalRequested = BLOOM_LEVELS.reduce(
    (sum, level) => sum + (body.counts[level] || 0),
    0,
  );

  if (totalRequested <= 0) {
    return new Response(
      JSON.stringify({ error: "Vui lòng nhập ít nhất 1 câu hỏi cho một mức Bloom." }),
      { status: 400 },
    );
  }

  if (totalRequested > MAX_TOTAL_QUESTIONS) {
    return new Response(
      JSON.stringify({
        error: `Tổng số câu hỏi (${totalRequested}) vượt quá giới hạn tối đa ${MAX_TOTAL_QUESTIONS} câu.`,
      }),
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "Server chưa cấu hình ANTHROPIC_API_KEY. Vui lòng thiết lập biến môi trường trước khi sinh câu hỏi.",
      }),
      { status: 500 },
    );
  }

  const scopedChunks = filterChunksByScope(
    body.chunks,
    body.scopeMode,
    body.selectedSectionTitles,
  );

  if (scopedChunks.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Không tìm thấy nội dung phù hợp với phạm vi đã chọn.",
      }),
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        for (const bloomLevel of BLOOM_LEVELS) {
          const requested = body.counts[bloomLevel] || 0;
          if (requested <= 0) continue;

          send({ type: "progress", bloomLevel, generated: 0, requested });

          const result = await generateBloomLevelQuestions({
            bloomLevel,
            requestedCount: requested,
            audience: body.audience,
            chunks: scopedChunks,
            onProgress: (generated) => {
              send({ type: "progress", bloomLevel, generated, requested });
            },
          });

          send({
            type: "level_done",
            bloomLevel,
            questions: result.questions,
          });

          if (result.warning) {
            send({ type: "warning", bloomLevel, message: result.warning });
          }
        }

        send({ type: "complete" });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Có lỗi không xác định khi sinh câu hỏi.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
