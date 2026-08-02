export const CLAUDE_MODEL = "claude-sonnet-4-6";

export const MAX_QUESTIONS_PER_BATCH = 5;
export const MAX_TOKENS_PER_BATCH = 4096;

/**
 * Giới hạn số ký tự tài liệu đưa vào MỘT prompt. Tài liệu lớn được chia
 * thành nhiều cửa sổ luân phiên qua các lô, thay vì nhồi toàn bộ vào mỗi
 * lần gọi (gây vượt giới hạn token và tốn kém).
 */
export const MAX_CONTEXT_CHARS_PER_PROMPT = 12000;
export const MAX_TRANSPORT_RETRIES = 3;
export const TRANSPORT_RETRY_BASE_DELAY_MS = 2000;
export const MAX_CITATION_RETRY_ROUNDS = 2;
export const MAX_CITATION_QUOTE_WORDS = 25;
export const MAX_CITATION_QUOTE_WORDS_HARD_LIMIT = 40;
