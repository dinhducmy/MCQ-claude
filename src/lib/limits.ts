import type { UploadLimits } from "@/lib/types";

const MB = 1024 * 1024;

export const MAX_FILES_PER_UPLOAD = 5;

/** Giới hạn khi chạy trên máy/máy chủ tự quản (không bị chặn bởi nền tảng). */
export const SELF_HOSTED_MAX_FILE_BYTES = 20 * MB;
export const SELF_HOSTED_MAX_TOTAL_BYTES = 40 * MB;

/**
 * Vercel giới hạn thân yêu cầu (request body) của Serverless Function ở
 * 4.5 MB — vượt ngưỡng này yêu cầu bị chặn ở tầng nền tảng, trước khi code
 * chạy, nên không thể trả về thông báo lỗi tiếng Việt. Vì vậy khi chạy trên
 * Vercel ta hạ ngưỡng xuống 4 MB (chừa chỗ cho phần bao multipart) và chặn
 * ngay từ trình duyệt.
 */
export const VERCEL_MAX_TOTAL_BYTES = 4 * MB;

/**
 * Giới hạn tải lên áp dụng cho môi trường đang chạy. Chỉ gọi ở phía máy chủ;
 * trình duyệt lấy giá trị này qua `GET /api/status`.
 */
export function getUploadLimits(): UploadLimits {
  const onVercel = Boolean(process.env.VERCEL);
  const maxTotalBytes = onVercel
    ? VERCEL_MAX_TOTAL_BYTES
    : SELF_HOSTED_MAX_TOTAL_BYTES;
  return {
    maxFiles: MAX_FILES_PER_UPLOAD,
    // Một file đơn lẻ cũng không thể vượt tổng dung lượng cho phép.
    maxFileBytes: Math.min(SELF_HOSTED_MAX_FILE_BYTES, maxTotalBytes),
    maxTotalBytes,
  };
}

/**
 * Giới hạn trình duyệt dùng tạm trước khi nhận được cấu hình thật từ máy chủ.
 * Chọn giá trị thận trọng nhất để không bao giờ gợi ý người dùng tải lên file
 * lớn hơn mức nền tảng chấp nhận.
 */
export const FALLBACK_UPLOAD_LIMITS: UploadLimits = {
  maxFiles: MAX_FILES_PER_UPLOAD,
  maxFileBytes: VERCEL_MAX_TOTAL_BYTES,
  maxTotalBytes: VERCEL_MAX_TOTAL_BYTES,
};

export function formatBytes(bytes: number): string {
  if (bytes >= MB) {
    const mb = bytes / MB;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} byte`;
}
