import { NextRequest, NextResponse } from "next/server";

import type { MCQQuestion } from "@/lib/types";
import { buildStudentDocx, buildTeacherDocx } from "@/lib/export/docx-export";
import { buildXlsxBuffer } from "@/lib/export/xlsx-export";
import { buildCsv } from "@/lib/export/csv-export";

export const runtime = "nodejs";

const EXPORT_TYPES = ["docx-teacher", "docx-student", "xlsx", "csv"] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

interface ExportRequestBody {
  type: ExportType;
  questions: MCQQuestion[];
  title?: string;
}

function validateBody(body: unknown): body is ExportRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!EXPORT_TYPES.includes(b.type as ExportType)) return false;
  if (!Array.isArray(b.questions) || b.questions.length === 0) return false;
  return true;
}

function sanitizeFileName(name: string): string {
  const base = name.replace(/\.[^./]+$/, "");
  const cleaned = base.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/-+/g, "-");
  return cleaned.slice(0, 60) || "cau-hoi";
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
      { error: "Thiếu hoặc sai định dạng dữ liệu yêu cầu (cần type và questions)." },
      { status: 400 },
    );
  }

  const baseName = sanitizeFileName(body.title || "cau-hoi");
  const documentTitle = body.title
    ? body.title.replace(/\.[^./]+$/, "")
    : "Bộ câu hỏi trắc nghiệm y khoa";

  try {
    switch (body.type) {
      case "docx-teacher": {
        const buffer = await buildTeacherDocx(body.questions, documentTitle);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${baseName}-giangvien.docx"`,
          },
        });
      }
      case "docx-student": {
        const buffer = await buildStudentDocx(body.questions, documentTitle);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${baseName}-sinhvien.docx"`,
          },
        });
      }
      case "xlsx": {
        const buffer = buildXlsxBuffer(body.questions);
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
          },
        });
      }
      case "csv": {
        const csv = buildCsv(body.questions);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${baseName}.csv"`,
          },
        });
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Có lỗi không xác định khi xuất file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
