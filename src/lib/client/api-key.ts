import { API_KEY_HEADER } from "@/lib/generation/resolve-api-key";

const STORAGE_KEY = "mcq-y-khoa.anthropic-api-key";

/** Sự kiện phát ra khi khóa thay đổi, để mọi thành phần đang mở cùng cập nhật. */
const CHANGE_EVENT = "mcq-api-key-change";

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Trình duyệt chặn localStorage (chế độ riêng tư nghiêm ngặt).
    return null;
  }
}

export function setStoredApiKey(key: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (key) window.localStorage.setItem(STORAGE_KEY, key);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Không chặn luồng nếu không lưu được. */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeApiKey(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Header kèm khóa API riêng của người dùng (nếu có). Khi không có, máy chủ
 * dùng khóa cấu hình sẵn trong biến môi trường.
 */
export function apiKeyHeaders(): Record<string, string> {
  const key = getStoredApiKey();
  return key ? { [API_KEY_HEADER]: key } : {};
}

/** Che khóa khi hiển thị: chỉ để lộ 4 ký tự cuối. */
export function maskApiKey(key: string): string {
  const tail = key.slice(-4);
  return `sk-ant-••••${tail}`;
}
