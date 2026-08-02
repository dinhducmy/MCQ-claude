import type { DocChunk } from "@/lib/types";
import { MAX_CONTEXT_CHARS_PER_PROMPT } from "@/lib/generation/constants";

/**
 * Chia danh sách chunk thành các "cửa sổ" liên tiếp, mỗi cửa sổ không vượt
 * quá giới hạn ký tự cho một prompt. Nhờ đó tài liệu lớn không bị nhồi
 * toàn bộ vào mỗi lần gọi model.
 */
export function buildContextWindows(
  chunks: DocChunk[],
  maxChars: number = MAX_CONTEXT_CHARS_PER_PROMPT,
): DocChunk[][] {
  if (chunks.length === 0) return [];

  const windows: DocChunk[][] = [];
  let current: DocChunk[] = [];
  let currentChars = 0;

  for (const chunk of chunks) {
    // Chunk đơn lẻ vượt giới hạn vẫn phải được đưa vào cửa sổ riêng của nó.
    if (current.length > 0 && currentChars + chunk.text.length > maxChars) {
      windows.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(chunk);
    currentChars += chunk.text.length;
  }
  if (current.length > 0) windows.push(current);

  return windows;
}

/**
 * Chọn cửa sổ nội dung cho lô thứ `batchIndex`, luân phiên qua toàn bộ tài
 * liệu để câu hỏi trải đều các phần thay vì dồn vào phần đầu.
 */
export function selectWindowForBatch(
  windows: DocChunk[][],
  batchIndex: number,
): DocChunk[] {
  if (windows.length === 0) return [];
  return windows[batchIndex % windows.length];
}
