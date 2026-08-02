import type { MCQQuestion } from "@/lib/types";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export const TABULAR_HEADERS = [
  "STT",
  "Mức Bloom",
  "Câu hỏi",
  "Lựa chọn A",
  "Lựa chọn B",
  "Lựa chọn C",
  "Lựa chọn D",
  "Đáp án đúng",
  "Giải thích đáp án đúng",
  "Vì sao A sai",
  "Vì sao B sai",
  "Vì sao C sai",
  "Vì sao D sai",
  "Trích dẫn",
  "Vị trí trích dẫn",
  "Mục tiêu học tập",
];

export function questionsToRows(questions: MCQQuestion[]): (string | number)[][] {
  return questions.map((q, idx) => [
    idx + 1,
    q.bloom_level,
    q.stem,
    q.options.A,
    q.options.B,
    q.options.C,
    q.options.D,
    q.correct_answer,
    q.explanation_correct,
    ...OPTION_KEYS.map((key) =>
      key === q.correct_answer ? "" : q.explanations_incorrect[key] ?? "",
    ),
    q.citation.quote,
    q.citation.location,
    q.learning_objective,
  ]);
}
