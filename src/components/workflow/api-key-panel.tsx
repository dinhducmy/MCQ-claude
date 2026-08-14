"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getStoredApiKey,
  maskApiKey,
  setStoredApiKey,
  subscribeApiKey,
} from "@/lib/client/api-key";
import { useServerStatus } from "@/lib/client/use-server-status";

export function ApiKeyPanel() {
  const { status } = useServerStatus();
  const [storedKey, setStoredKeyState] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const sync = () => setStoredKeyState(getStoredApiKey());
    sync();
    return subscribeApiKey(sync);
  }, []);

  function handleSave() {
    const value = draft.trim();
    if (!value.startsWith("sk-ant-")) {
      toast.error('Khóa API Anthropic phải bắt đầu bằng "sk-ant-".');
      return;
    }
    setStoredApiKey(value);
    setDraft("");
    setIsEditing(false);
    toast.success("Đã lưu khóa API vào trình duyệt này.");
  }

  function handleClear() {
    setStoredApiKey(null);
    setDraft("");
    setIsEditing(false);
    toast.success("Đã xóa khóa API khỏi trình duyệt.");
  }

  if (!status) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Đang kiểm tra cấu hình khóa API…
      </div>
    );
  }

  const hasKey = status.apiKeyConfigured || Boolean(storedKey);
  const showForm = isEditing || !hasKey;

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-4 text-sm",
        hasKey
          ? "bg-card"
          : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium">
          {hasKey ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <KeyRound className="size-4" />
          )}
          {storedKey
            ? `Đang dùng khóa API riêng của bạn (${maskApiKey(storedKey)})`
            : status.apiKeyConfigured
              ? "Đang dùng khóa API cấu hình sẵn của máy chủ"
              : "Chưa có khóa API — chưa sinh được câu hỏi"}
        </p>
        {hasKey && !isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              {storedKey ? "Đổi khóa" : "Dùng khóa riêng"}
            </Button>
            {storedKey && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Xóa khóa
              </Button>
            )}
          </div>
        )}
      </div>

      {!hasKey && (
        <p>
          Các bước tải lên, xem trước, xem/sửa và xuất file vẫn dùng được, nhưng
          bước sinh câu hỏi cần khóa API Anthropic. Nhập khóa của bạn bên dưới,
          hoặc cấu hình biến môi trường{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">
            ANTHROPIC_API_KEY
          </code>{" "}
          cho máy chủ (trên Vercel: Settings → Environment Variables).
        </p>
      )}

      {showForm && (
        <div className="space-y-2">
          <Label htmlFor="api-key-input">Khóa API Anthropic</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="api-key-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-ant-..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className="min-w-56 flex-1 bg-background"
            />
            <Button onClick={handleSave} disabled={!draft.trim()}>
              Lưu khóa
            </Button>
            {isEditing && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft("");
                  setIsEditing(false);
                }}
              >
                Hủy
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Khóa được lưu trong trình duyệt của bạn (localStorage) và gửi kèm
            từng yêu cầu sinh câu hỏi để máy chủ gọi Anthropic API. Máy chủ
            không lưu và không ghi log khóa. Lấy khóa tại console.anthropic.com.
            {status.apiKeyConfigured &&
              " Khi bạn lưu khóa riêng, khóa này được dùng thay cho khóa của máy chủ."}
          </p>
        </div>
      )}
    </div>
  );
}
