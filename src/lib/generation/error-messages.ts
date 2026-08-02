import Anthropic from "@anthropic-ai/sdk";

/**
 * Chuyển lỗi từ Anthropic SDK thành thông báo tiếng Việt rõ ràng cho người
 * dùng cuối, thay vì trả về JSON lỗi tiếng Anh thô.
 */
export function toVietnameseErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "Khóa API không hợp lệ. Vui lòng kiểm tra lại ANTHROPIC_API_KEY trong file .env.local rồi khởi động lại server.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "Khóa API không có quyền sử dụng model này. Vui lòng kiểm tra quyền của khóa trong Anthropic Console.";
  }
  if (err instanceof Anthropic.NotFoundError) {
    return "Không tìm thấy model được cấu hình. Vui lòng kiểm tra lại tên model trong cấu hình hệ thống.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Đã vượt giới hạn tần suất gọi API (rate limit) sau nhiều lần thử lại. Vui lòng đợi ít phút rồi sinh lại; các câu đã sinh thành công vẫn được giữ.";
  }
  if (err instanceof Anthropic.InternalServerError) {
    return "Máy chủ Anthropic đang gặp sự cố sau nhiều lần thử lại. Vui lòng thử lại sau ít phút; các câu đã sinh thành công vẫn được giữ.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Không kết nối được tới máy chủ Anthropic. Vui lòng kiểm tra kết nối mạng rồi thử lại.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    return "Yêu cầu gửi tới model không hợp lệ (có thể do nội dung tài liệu quá lớn). Vui lòng thử thu hẹp phạm vi nội dung hoặc giảm số câu hỏi.";
  }
  if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
    return err.message;
  }
  return "Có lỗi không xác định khi sinh câu hỏi. Vui lòng thử lại.";
}
