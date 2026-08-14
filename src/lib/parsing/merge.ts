import type {
  DocChunk,
  DocumentBundle,
  DocumentSource,
  OutlineItem,
  ParsedDocument,
} from "@/lib/types";

function bundleTitle(docs: ParsedDocument[]): string {
  if (docs.length === 0) return "tai-lieu";
  if (docs.length === 1) return docs[0].fileName;
  return `${docs[0].fileName} và ${docs.length - 1} tài liệu khác`;
}

/**
 * Gộp kết quả bóc tách của nhiều file thành một nguồn nội dung duy nhất.
 *
 * Khi có từ 2 file trở lên, mọi vị trí trích dẫn được gắn thêm tên file
 * ("giao-trinh.pdf · Trang 12") để câu hỏi luôn truy vết được về đúng tài
 * liệu gốc, và id của chunk/đề mục được thêm tiền tố theo file để không bị
 * trùng giữa các tài liệu.
 */
export function mergeParsedDocuments(docs: ParsedDocument[]): DocumentBundle {
  const multi = docs.length > 1;
  const outline: OutlineItem[] = [];
  const chunks: DocChunk[] = [];
  const warnings: string[] = [];
  const sources: DocumentSource[] = [];

  let chunkIndex = 0;
  let totalWords = 0;
  let totalPages = 0;
  let hasPageCount = false;

  docs.forEach((doc, docIdx) => {
    const prefix = `d${docIdx}`;
    const locate = (location: string) =>
      multi ? `${doc.fileName} · ${location}` : location;

    sources.push({
      fileName: doc.fileName,
      fileType: doc.fileType,
      sizeBytes: doc.sizeBytes,
      pageCount: doc.pageCount,
      wordCount: doc.wordCount,
    });

    for (const item of doc.outline) {
      outline.push({
        ...item,
        id: `${prefix}-${item.id}`,
        location: locate(item.location),
        sourceFile: doc.fileName,
      });
    }

    for (const chunk of doc.chunks) {
      chunkIndex += 1;
      chunks.push({
        ...chunk,
        id: `${prefix}-${chunk.id}`,
        index: chunkIndex,
        location: locate(chunk.location),
        sourceFile: doc.fileName,
      });
    }

    for (const warning of doc.warnings) {
      warnings.push(multi ? `${doc.fileName}: ${warning}` : warning);
    }

    totalWords += doc.wordCount;
    if (doc.pageCount != null) {
      totalPages += doc.pageCount;
      hasPageCount = true;
    }
  });

  return {
    title: bundleTitle(docs),
    sources,
    pageCount: hasPageCount ? totalPages : null,
    wordCount: totalWords,
    outline,
    chunks,
    warnings,
  };
}
