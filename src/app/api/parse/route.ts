import { NextRequest, NextResponse } from "next/server";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  type ParsedDocument,
} from "@/lib/types";

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Không tìm thấy file trong yêu cầu." },
      { status: 400 },
    );
  }

  const ext = getExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
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

  const result: ParsedDocument = {
    fileName: file.name,
    fileType,
    sizeBytes: file.size,
    pageCount: null,
    wordCount: 0,
    outline: [],
    chunks: [],
    warnings: [
      "Bóc tách nội dung đầy đủ sẽ được triển khai ở bước tiếp theo.",
    ],
  };

  return NextResponse.json(result);
}
