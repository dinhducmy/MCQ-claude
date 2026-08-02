import { NextRequest, NextResponse } from "next/server";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  type ParsedDocument,
} from "@/lib/types";
import {
  DocumentParseError,
  ScannedPdfError,
  parseDocument,
} from "@/lib/parsing";

export const runtime = "nodejs";

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
}

export async function POST(req: NextRequest) {
  let file: File;
  try {
    const formData = await req.formData();
    const f = formData.get("file");
    if (!f || !(f instanceof File)) {
      return NextResponse.json(
        { error: "Không tìm thấy file trong yêu cầu." },
        { status: 400 },
      );
    }
    file = f;
  } catch {
    return NextResponse.json(
      { error: "Không thể đọc dữ liệu tải lên." },
      { status: 400 },
    );
  }

  const ext = getExtension(file.name);
  if (
    !ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])
  ) {
    return NextResponse.json(
      {
        error: `Định dạng file "${ext || "không xác định"}" không được hỗ trợ. Vui lòng tải lên file .pdf, .docx, .txt hoặc .md.`,
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: `File vượt quá dung lượng tối đa 20 MB (dung lượng hiện tại: ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "File rỗng hoặc bị hỏng." },
      { status: 400 },
    );
  }

  const fileType = ext.slice(1) as ParsedDocument["fileType"];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await parseDocument(file.name, fileType, buffer);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ScannedPdfError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof DocumentParseError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("Lỗi bóc tách tài liệu:", err);
    return NextResponse.json(
      {
        error:
          "Có lỗi không mong muốn khi xử lý tài liệu. Vui lòng thử lại hoặc kiểm tra file.",
      },
      { status: 500 },
    );
  }
}
