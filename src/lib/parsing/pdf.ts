import { PDFParse } from "pdf-parse";

import type { DocChunk, OutlineItem } from "@/lib/types";
import { buildChunks, buildOutline } from "@/lib/parsing/chunk";
import { detectHeading } from "@/lib/parsing/heading";
import { countWords, type ContentUnit } from "@/lib/parsing/units";

export class ScannedPdfError extends Error {
  constructor() {
    super(
      "File PDF này dường như là bản scan/ảnh, không có lớp văn bản (text layer). Vui lòng dùng công cụ OCR để chuyển đổi trước khi tải lên.",
    );
    this.name = "ScannedPdfError";
  }
}

const MIN_AVG_CHARS_PER_PAGE = 15;

export interface PdfParseResult {
  pageCount: number;
  wordCount: number;
  outline: OutlineItem[];
  chunks: DocChunk[];
}

export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const pageCount = textResult.total;

    const totalChars = textResult.pages.reduce(
      (sum, p) => sum + p.text.replace(/\s/g, "").length,
      0,
    );
    if (pageCount === 0 || totalChars / Math.max(pageCount, 1) < MIN_AVG_CHARS_PER_PAGE) {
      throw new ScannedPdfError();
    }

    const units: ContentUnit[] = [];
    const headingStack: string[] = [];

    for (const page of textResult.pages) {
      const lines = page.text.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const location = `Trang ${page.num}`;
        const heading = detectHeading(line);
        if (heading) {
          headingStack[heading.level - 1] = heading.title;
          headingStack.length = heading.level;
          units.push({
            text: heading.title,
            location,
            headingPath: [...headingStack],
            isHeading: true,
            headingLevel: heading.level,
            page: page.num,
          });
        } else {
          units.push({
            text: line,
            location,
            headingPath: [...headingStack],
            isHeading: false,
            page: page.num,
          });
        }
      }
    }

    const wordCount = countWords(textResult.text);

    return {
      pageCount,
      wordCount,
      outline: buildOutline(units),
      chunks: buildChunks(units),
    };
  } finally {
    await parser.destroy();
  }
}
