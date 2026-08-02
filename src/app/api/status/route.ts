import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cho phép giao diện biết server đã cấu hình khóa API hay chưa, để cảnh báo
 * người dùng NGAY từ đầu thay vì để họ cấu hình xong mới gặp lỗi.
 * Chỉ trả về trạng thái true/false — không bao giờ trả về giá trị khóa.
 */
export async function GET() {
  return NextResponse.json({
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
