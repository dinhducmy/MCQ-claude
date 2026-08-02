"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";

export function ApiKeyNotice() {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.apiKeyConfigured === false) setMissing(true);
      })
      .catch(() => {
        /* Không chặn luồng nếu không kiểm tra được trạng thái. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!missing) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <KeyRound className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-2">
        <p className="font-medium">Chưa cấu hình khóa API — chưa sinh được câu hỏi</p>
        <p>
          Các bước tải lên, xem trước, xem/sửa và xuất file vẫn dùng được, nhưng
          bước sinh câu hỏi cần khóa API Anthropic. Để bật:
        </p>
        <ol className="list-inside list-decimal space-y-1">
          <li>
            Tạo file <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code>{" "}
            ở thư mục gốc dự án (có thể sao chép từ{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.example</code>).
          </li>
          <li>
            Thêm dòng{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
              ANTHROPIC_API_KEY=sk-ant-...
            </code>{" "}
            (lấy khóa tại console.anthropic.com).
          </li>
          <li>Khởi động lại server để nạp biến môi trường mới.</li>
        </ol>
      </div>
    </div>
  );
}
