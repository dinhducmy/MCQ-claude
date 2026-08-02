import { BLOOM_LEVELS, type BloomLevel, type MCQQuestion } from "@/lib/types";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

const FORBIDDEN_PATTERNS = [
  /tất cả (các )?(đáp án |phương án |ý )?(đều|trên đều) đúng/i,
  /không (có )?(đáp án|phương án|ý) nào đúng/i,
  /\b[ab] và [ab] (đều )?đúng/i,
  /all of the above/i,
  /none of the above/i,
];

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateQuestionShape(
  raw: unknown,
  expectedBloomLevel: BloomLevel,
): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "Câu hỏi không phải object hợp lệ." };
  }
  const q = raw as Record<string, unknown>;

  if (!isNonEmptyString(q.stem)) {
    return { ok: false, reason: "Thiếu nội dung câu hỏi (stem)." };
  }

  if (
    !BLOOM_LEVELS.includes(q.bloom_level as BloomLevel) ||
    q.bloom_level !== expectedBloomLevel
  ) {
    return {
      ok: false,
      reason: `Mức Bloom không khớp (kỳ vọng "${expectedBloomLevel}").`,
    };
  }

  if (typeof q.options !== "object" || q.options === null) {
    return { ok: false, reason: "Thiếu các lựa chọn (options)." };
  }
  const options = q.options as Record<string, unknown>;
  for (const key of OPTION_KEYS) {
    if (!isNonEmptyString(options[key])) {
      return { ok: false, reason: `Thiếu lựa chọn ${key}.` };
    }
  }

  const optionTexts = OPTION_KEYS.map((k) => String(options[k]));
  const uniqueOptions = new Set(optionTexts.map((t) => t.trim().toLowerCase()));
  if (uniqueOptions.size !== 4) {
    return { ok: false, reason: "Các lựa chọn bị trùng lặp." };
  }
  for (const text of optionTexts) {
    if (FORBIDDEN_PATTERNS.some((re) => re.test(text))) {
      return {
        ok: false,
        reason: `Lựa chọn chứa cụm bị cấm: "${text.slice(0, 40)}".`,
      };
    }
  }

  if (
    typeof q.correct_answer !== "string" ||
    !OPTION_KEYS.includes(q.correct_answer as (typeof OPTION_KEYS)[number])
  ) {
    return { ok: false, reason: "Đáp án đúng không hợp lệ." };
  }
  const correctAnswer = q.correct_answer as (typeof OPTION_KEYS)[number];

  const optionLengths = OPTION_KEYS.map((k) => options[k]?.toString().trim().length ?? 0);
  const maxLength = Math.max(...optionLengths);
  const longestKeys = OPTION_KEYS.filter((k, i) => optionLengths[i] === maxLength);
  if (longestKeys.length === 1 && longestKeys[0] === correctAnswer) {
    return {
      ok: false,
      reason: "Đáp án đúng là lựa chọn dài nhất — vi phạm quy tắc độ dài tương đương.",
    };
  }

  if (!isNonEmptyString(q.explanation_correct)) {
    return { ok: false, reason: "Thiếu giải thích cho đáp án đúng." };
  }

  if (typeof q.citation !== "object" || q.citation === null) {
    return { ok: false, reason: "Thiếu trích dẫn (citation)." };
  }
  const citation = q.citation as Record<string, unknown>;
  if (!isNonEmptyString(citation.quote) || !isNonEmptyString(citation.location)) {
    return { ok: false, reason: "Trích dẫn thiếu quote hoặc location." };
  }

  if (
    typeof q.explanations_incorrect !== "object" ||
    q.explanations_incorrect === null
  ) {
    return { ok: false, reason: "Thiếu giải thích cho các đáp án sai." };
  }
  const explanationsIncorrect = q.explanations_incorrect as Record<
    string,
    unknown
  >;
  const incorrectKeys = OPTION_KEYS.filter((k) => k !== correctAnswer);
  for (const key of incorrectKeys) {
    if (!isNonEmptyString(explanationsIncorrect[key])) {
      return {
        ok: false,
        reason: `Thiếu giải thích vì sao phương án ${key} sai.`,
      };
    }
  }

  if (!isNonEmptyString(q.learning_objective)) {
    return { ok: false, reason: "Thiếu mục tiêu học tập." };
  }

  return { ok: true };
}

export function toMCQQuestion(
  raw: unknown,
  id: string,
): MCQQuestion {
  const q = raw as Record<string, unknown>;
  const options = q.options as Record<string, unknown>;
  const citation = q.citation as Record<string, unknown>;
  const explanationsIncorrect = q.explanations_incorrect as Record<
    string,
    unknown
  >;
  const correctAnswer = q.correct_answer as "A" | "B" | "C" | "D";
  const incorrectKeys = OPTION_KEYS.filter((k) => k !== correctAnswer);

  return {
    id,
    bloom_level: q.bloom_level as BloomLevel,
    stem: String(q.stem),
    options: {
      A: String(options.A),
      B: String(options.B),
      C: String(options.C),
      D: String(options.D),
    },
    correct_answer: correctAnswer,
    explanation_correct: String(q.explanation_correct),
    citation: {
      quote: String(citation.quote),
      location: String(citation.location),
    },
    explanations_incorrect: Object.fromEntries(
      incorrectKeys.map((k) => [k, String(explanationsIncorrect[k])]),
    ),
    learning_objective: String(q.learning_objective),
    citation_verified: true,
  };
}
