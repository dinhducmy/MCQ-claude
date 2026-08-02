const CHAPTER_PREFIX =
  /^(chương|phần|bài|mục)\s+([0-9]+|[ivxlcdm]+)\b/iu;

const NUMBERED_MULTI = /^(\d+(?:\.\d+){1,4})\.?\s+\S/;
const NUMBERED_SINGLE = /^(\d+)[.)]\s+\S/;
const ROMAN_SINGLE = /^([IVXLCDM]{1,6})[.)]\s+\S/;
const ALPHA_SINGLE = /^([A-Z])[.)]\s+\S/;

function isMostlyUppercase(line: string): boolean {
  const letters = line.replace(/[^\p{L}]/gu, "");
  if (letters.length < 3) return false;
  const upper = letters.toUpperCase();
  return letters === upper && /\p{Lu}/u.test(letters);
}

export interface HeadingMatch {
  level: number;
  title: string;
}

/**
 * Dò heuristic tiêu đề/đề mục cho văn bản thuần (PDF/TXT không có style).
 * Trả về null nếu dòng không giống tiêu đề.
 */
export function detectHeading(rawLine: string): HeadingMatch | null {
  const line = rawLine.trim();
  if (!line || line.length > 120) return null;

  const chapterMatch = line.match(CHAPTER_PREFIX);
  if (chapterMatch) {
    return { level: 1, title: line };
  }

  const multi = line.match(NUMBERED_MULTI);
  if (multi) {
    const depth = multi[1].split(".").length;
    return { level: Math.min(depth, 4), title: line };
  }

  if (/[.!?]$/.test(line)) {
    return null;
  }

  const single = line.match(NUMBERED_SINGLE);
  if (single) {
    return { level: 1, title: line };
  }

  const roman = line.match(ROMAN_SINGLE);
  if (roman) {
    return { level: 1, title: line };
  }

  const alpha = line.match(ALPHA_SINGLE);
  if (alpha) {
    return { level: 2, title: line };
  }

  if (isMostlyUppercase(line) && line.length <= 90) {
    return { level: 2, title: line };
  }

  return null;
}
