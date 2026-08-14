import { NextRequest, NextResponse } from "next/server";
import {
  ACCEPTED_EXTENSIONS,
  type ParsedDocument,
} from "@/lib/types";
import {
  DocumentParseError,
  ScannedPdfError,
  parseDocument,
} from "@/lib/parsing";
import { mergeParsedDocuments } from "@/lib/parsing/merge";
import { formatBytes, getUploadLimits } from "@/lib/limits";

export const runtime = "nodejs";

function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx).toLowerCase();
}

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  const limits = getUploadLimits();

  let files: File[];
  try {
    const formData = await req.formData();
    // "files" là dạng nhiều file; "file" giữ lại cho tương thích ngược.
    files = [...formData.getAll("files"), ...formData.getAll("file")].filter(
      (entry): entry is File => entry instanceof File,
    );
  } catch {
    return badRequest("Không thể đọc dữ liệu tải lên.");
  }

  if (files.length === 0) {
    return badRequest("Không tìm thấy file nào trong yêu cầu.");
  }

  if (files.length > limits.maxFiles) {
    return badRequest(
      `Chỉ được tải lên tối đa ${limits.maxFiles} file mỗi lần (đang có ${files.length} file).`,
    );
  }

  let totalBytes = 0;
  for (const file of files) {
    const ext = getExtension(file.name);
    if (
      !ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])
    ) {
      return badRequest(
        `File "${file.name}" có định dạng "${ext || "không xác định"}" không được hỗ trợ. Chỉ chấp nhận .pdf, .docx, .txt, .md.`,
      );
    }
    if (file.size === 0) {
      return badRequest(`File "${file.name}" rỗng hoặc bị hỏng.`);
    }
    if (file.size > limits.maxFileBytes) {
      return badRequest(
        `File "${file.name}" (${formatBytes(file.size)}) vượt quá dung lượng tối đa ${formatBytes(limits.maxFileBytes)} cho một file.`,
      );
    }
    totalBytes += file.size;
  }

  if (totalBytes > limits.maxTotalBytes) {
    return badRequest(
      `Tổng dung lượng ${files.length} file (${formatBytes(totalBytes)}) vượt quá giới hạn ${formatBytes(limits.maxTotalBytes)} mỗi lần tải lên.`,
    );
  }

  const parsed: ParsedDocument[] = [];

  for (const file of files) {
    const fileType = getExtension(file.name).slice(
      1,
    ) as ParsedDocument["fileType"];
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      parsed.push(await parseDocument(file.name, fileType, buffer));
    } catch (err) {
      if (err instanceof ScannedPdfError || err instanceof DocumentParseError) {
        return NextResponse.json(
          {
            error:
              files.length > 1 ? `File "${file.name}": ${err.message}` : err.message,
          },
          { status: 422 },
        );
      }
      console.error("Lỗi bóc tách tài liệu:", err);
      return NextResponse.json(
        {
          error: `Có lỗi không mong muốn khi xử lý file "${file.name}". Vui lòng thử lại hoặc kiểm tra file.`,
        },
        { status: 500 },
      );
    }
  }

  const totalWords = parsed.reduce((sum, doc) => sum + doc.wordCount, 0);
  if (totalWords === 0) {
    return badRequest(
      "Không trích xuất được nội dung văn bản nào từ tài liệu đã tải lên.",
      422,
    );
  }

  return NextResponse.json(mergeParsedDocuments(parsed));
}
