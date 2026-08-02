export const BLOOM_LEVELS = [
  "Nhớ",
  "Hiểu",
  "Vận dụng",
  "Phân tích",
  "Đánh giá",
  "Sáng tạo",
] as const;

export type BloomLevel = (typeof BLOOM_LEVELS)[number];

export const BLOOM_LEVEL_INFO: Record<
  BloomLevel,
  { en: string; description: string }
> = {
  Nhớ: {
    en: "Remember",
    description: "Nhắc lại sự kiện, định nghĩa, thuật ngữ y khoa cơ bản",
  },
  Hiểu: {
    en: "Understand",
    description: "Giải thích, diễn giải khái niệm, cơ chế bằng lời riêng",
  },
  "Vận dụng": {
    en: "Apply",
    description: "Áp dụng kiến thức vào bệnh cảnh lâm sàng cụ thể",
  },
  "Phân tích": {
    en: "Analyze",
    description: "Phân tích dữ kiện lâm sàng, phân biệt chẩn đoán",
  },
  "Đánh giá": {
    en: "Evaluate",
    description: "Biện luận, đánh giá lựa chọn xử trí, ưu nhược điểm",
  },
  "Sáng tạo": {
    en: "Create",
    description: "Xây dựng kế hoạch/chiến lược xử trí toàn diện, mới",
  },
};

export const AUDIENCE_OPTIONS = [
  { value: "sv-y2-y6", label: "Sinh viên Y2–Y6" },
  { value: "sau-dai-hoc", label: "Học viên sau đại học" },
  { value: "cme", label: "CME (đào tạo liên tục)" },
] as const;

export type AudienceValue = (typeof AUDIENCE_OPTIONS)[number]["value"];

export const SCOPE_MODES = [
  { value: "all", label: "Toàn bộ tài liệu" },
  { value: "sections", label: "Chọn theo đề mục" },
] as const;

export type ScopeMode = (typeof SCOPE_MODES)[number]["value"];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_TOTAL_QUESTIONS = 60;
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;

export interface OutlineItem {
  id: string;
  level: number;
  title: string;
  location: string;
}

export interface DocChunk {
  id: string;
  index: number;
  text: string;
  location: string;
  startPage?: number;
  endPage?: number;
  headingPath: string[];
  wordCount: number;
}

export interface ParsedDocument {
  fileName: string;
  fileType: "pdf" | "docx" | "txt" | "md";
  sizeBytes: number;
  pageCount: number | null;
  wordCount: number;
  outline: OutlineItem[];
  chunks: DocChunk[];
  warnings: string[];
}

export interface BloomCounts {
  Nhớ: number;
  Hiểu: number;
  "Vận dụng": number;
  "Phân tích": number;
  "Đánh giá": number;
  "Sáng tạo": number;
}

export const EMPTY_BLOOM_COUNTS: BloomCounts = {
  Nhớ: 0,
  Hiểu: 0,
  "Vận dụng": 0,
  "Phân tích": 0,
  "Đánh giá": 0,
  "Sáng tạo": 0,
};

export interface QuestionCitation {
  quote: string;
  location: string;
}

export interface MCQQuestion {
  id: string;
  bloom_level: BloomLevel;
  stem: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: "A" | "B" | "C" | "D";
  explanation_correct: string;
  citation: QuestionCitation;
  explanations_incorrect: Partial<Record<"A" | "B" | "C" | "D", string>>;
  learning_objective: string;
  citation_verified?: boolean;
}

export interface GenerationConfig {
  counts: BloomCounts;
  audience: AudienceValue;
  scopeMode: ScopeMode;
  selectedOutlineIds: string[];
}
