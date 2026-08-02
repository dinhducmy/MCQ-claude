import { MAX_CITATION_QUOTE_WORDS_HARD_LIMIT } from "@/lib/generation/constants";

/**
 * Chuẩn hóa văn bản để so khớp trích dẫn: gộp khoảng trắng, bỏ dấu câu,
 * chuyển thường. Giữ nguyên chữ cái/số/dấu tiếng Việt.
 */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;:!?"'()[\]{}«»""''`~*_\-–—/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CitationCheckResult {
  ok: boolean;
  reason?: string;
}

export function verifyCitation(
  quote: string,
  sourceText: string,
): CitationCheckResult {
  const trimmedQuote = quote?.trim();
  if (!trimmedQuote) {
    return { ok: false, reason: "Trích dẫn rỗng." };
  }

  const wordCount = trimmedQuote.split(/\s+/).length;
  if (wordCount > MAX_CITATION_QUOTE_WORDS_HARD_LIMIT) {
    return {
      ok: false,
      reason: `Trích dẫn quá dài (${wordCount} từ, giới hạn ${MAX_CITATION_QUOTE_WORDS_HARD_LIMIT} từ).`,
    };
  }

  const normalizedQuote = normalizeForMatch(trimmedQuote);
  const normalizedSource = normalizeForMatch(sourceText);

  if (!normalizedQuote) {
    return { ok: false, reason: "Trích dẫn rỗng sau khi chuẩn hóa." };
  }

  if (!normalizedSource.includes(normalizedQuote)) {
    return {
      ok: false,
      reason: "Trích dẫn không khớp với nội dung gốc của tài liệu.",
    };
  }

  return { ok: true };
}
