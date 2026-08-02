import type { ParsedDocument } from "@/lib/types";
import { parsePdf, ScannedPdfError } from "@/lib/parsing/pdf";
import { parseDocx } from "@/lib/parsing/docx";
import { parseText } from "@/lib/parsing/text";

export { ScannedPdfError };

export class DocumentParseError extends Error {}

export async function parseDocument(
  fileName: string,
  fileType: ParsedDocument["fileType"],
  buffer: Buffer,
): Promise<ParsedDocument> {
  const warnings: string[] = [];

  if (fileType === "pdf") {
    let result;
    try {
      result = await parsePdf(buffer);
    } catch (err) {
      if (err instanceof ScannedPdfError) throw err;
      console.error("Lỗi bóc tách PDF:", err);
      throw new DocumentParseError(
        "Không thể đọc file PDF. File có thể bị hỏng, mã hóa hoặc không đúng định dạng PDF.",
      );
    }
    if (result.outline.length === 0) {
      warnings.push(
        "Không phát hiện được cấu trúc đề mục rõ ràng trong tài liệu. Câu hỏi vẫn có thể được sinh, nhưng vị trí trích dẫn sẽ hiển thị theo số trang.",
      );
    }
    return {
      fileName,
      fileType,
      sizeBytes: buffer.byteLength,
      pageCount: result.pageCount,
      wordCount: result.wordCount,
      outline: result.outline,
      chunks: result.chunks,
      warnings,
    };
  }

  if (fileType === "docx") {
    let result;
    try {
      result = await parseDocx(buffer);
    } catch {
      throw new DocumentParseError(
        "Không thể đọc file .docx. File có thể bị hỏng hoặc không đúng định dạng Word (.docx).",
      );
    }
    if (result.outline.length === 0) {
      warnings.push(
        "Không phát hiện tiêu đề (Heading styles) trong tài liệu Word. Hãy đảm bảo các đề mục được định dạng bằng style Heading 1/2/3 để có bản xem trước cấu trúc tốt hơn.",
      );
    }
    return {
      fileName,
      fileType,
      sizeBytes: buffer.byteLength,
      pageCount: null,
      wordCount: result.wordCount,
      outline: result.outline,
      chunks: result.chunks,
      warnings: [...warnings, ...result.warnings],
    };
  }

  // txt / md
  let content: string;
  try {
    content = buffer.toString("utf-8");
  } catch {
    throw new DocumentParseError("Không thể đọc nội dung file văn bản.");
  }
  if (!content.trim()) {
    throw new DocumentParseError("File rỗng, không có nội dung để xử lý.");
  }
  const result = parseText(content, fileType === "md");

  return {
    fileName,
    fileType,
    sizeBytes: buffer.byteLength,
    pageCount: null,
    wordCount: result.wordCount,
    outline: result.outline,
    chunks: result.chunks,
    warnings,
  };
}
