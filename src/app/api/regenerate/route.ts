import { NextRequest, NextResponse } from "next/server";

import { BLOOM_LEVELS, type AudienceValue, type BloomLevel, type DocChunk } from "@/lib/types";
import { generateBloomLevelQuestions } from "@/lib/generation/generate-level";
import { toVietnameseErrorMessage } from "@/lib/generation/error-messages";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RegenerateRequestBody {
  chunks: DocChunk[];
  bloomLevel: BloomLevel;
  audience: AudienceValue;
  avoidStems?: string[];
}

function validateBody(body: unknown): body is RegenerateRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.chunks) || b.chunks.length === 0) return false;
  if (!BLOOM_LEVELS.includes(b.bloomLevel as BloomLevel)) return false;
  if (typeof b.audience !== "string") return false;
  return true;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu yêu cầu không hợp lệ (không phải JSON)." },
      { status: 400 },
    );
  }

  if (!validateBody(body)) {
    return NextResponse.json(
      { error: "Thiếu hoặc sai định dạng dữ liệu yêu cầu." },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Server chưa cấu hình ANTHROPIC_API_KEY. Vui lòng thiết lập biến môi trường trước khi sinh câu hỏi.",
      },
      { status: 500 },
    );
  }

  try {
    const result = await generateBloomLevelQuestions({
      bloomLevel: body.bloomLevel,
      requestedCount: 1,
      audience: body.audience,
      chunks: body.chunks,
      avoidStems: body.avoidStems,
      // Đổi cửa sổ nội dung mỗi lần sinh lại để tránh lặp lại đúng phần cũ.
      windowStartOffset: body.avoidStems?.length ?? 0,
    });

    if (result.questions.length === 0) {
      return NextResponse.json(
        {
          error:
            "Không thể sinh lại câu hỏi từ tài liệu (nội dung không đủ hoặc trích dẫn không xác minh được).",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ question: result.questions[0] });
  } catch (err) {
    console.error("Lỗi sinh lại câu hỏi:", err);
    return NextResponse.json(
      { error: toVietnameseErrorMessage(err) },
      { status: 500 },
    );
  }
}
