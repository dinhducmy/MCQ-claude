/** Header trình duyệt dùng để gửi khóa API riêng của người dùng. */
export const API_KEY_HEADER = "x-anthropic-api-key";

export class ApiKeyError extends Error {}

function looksLikeAnthropicKey(value: string): boolean {
  return /^sk-ant-[A-Za-z0-9\-_]{20,}$/.test(value);
}

/**
 * Xác định khóa API dùng cho một yêu cầu: ưu tiên khóa người dùng tự nhập
 * trên giao diện (gửi qua header), nếu không có thì dùng khóa cấu hình sẵn
 * của máy chủ.
 *
 * Khóa chỉ tồn tại trong vòng đời của yêu cầu — không ghi log, không lưu trữ.
 */
export function resolveApiKey(headers: Headers): string {
  const fromHeader = headers.get(API_KEY_HEADER)?.trim();

  if (fromHeader) {
    if (!looksLikeAnthropicKey(fromHeader)) {
      throw new ApiKeyError(
        'Khóa API bạn nhập không đúng định dạng. Khóa Anthropic bắt đầu bằng "sk-ant-". Vui lòng kiểm tra lại trong phần cấu hình khóa API.',
      );
    }
    return fromHeader;
  }

  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  throw new ApiKeyError(
    "Chưa có khóa API Anthropic. Hãy nhập khóa của bạn ở phần cấu hình khóa API trên giao diện, hoặc thiết lập biến môi trường ANTHROPIC_API_KEY cho máy chủ.",
  );
}
