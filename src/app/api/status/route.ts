import { NextResponse } from "next/server";

import { getUploadLimits } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cho giao diện biết máy chủ đã cấu hình khóa API hay chưa (để hướng dẫn
 * người dùng NGAY từ đầu thay vì để họ làm xong mới gặp lỗi) và giới hạn tải
 * lên thực tế của môi trường đang chạy.
 *
 * Chỉ trả về trạng thái true/false — không bao giờ trả về giá trị khóa.
 */
export async function GET() {
  return NextResponse.json({
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    uploadLimits: getUploadLimits(),
  });
}
