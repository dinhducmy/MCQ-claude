"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileText, UploadCloud, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/limits";
import {
  ACCEPTED_EXTENSIONS,
  type DocumentBundle,
  type UploadLimits,
} from "@/lib/types";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    [".docx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

interface FileDropzoneProps {
  onParsed: (bundle: DocumentBundle) => void;
  bundle: DocumentBundle | null;
  onReset: () => void;
  limits: UploadLimits;
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}`;
}

export function FileDropzone({
  onParsed,
  bundle,
  onReset,
  limits,
}: FileDropzoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (nextFiles: File[]) => {
      setError(null);
      setIsUploading(true);
      try {
        const formData = new FormData();
        for (const file of nextFiles) formData.append("files", file);

        const res = await fetch("/api/parse", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Có lỗi xảy ra khi xử lý tài liệu.");
        }
        setFiles(nextFiles);
        onParsed(data as DocumentBundle);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Có lỗi không xác định.";
        setError(message);
        toast.error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [onParsed],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      setError(null);

      if (rejections.length > 0) {
        const codeErr = rejections[0].errors[0];
        let message = `File "${rejections[0].file.name}" không hợp lệ.`;
        if (codeErr?.code === "file-too-large") {
          message = `File "${rejections[0].file.name}" vượt quá dung lượng tối đa ${formatBytes(limits.maxFileBytes)}.`;
        } else if (codeErr?.code === "file-invalid-type") {
          message = `Định dạng của "${rejections[0].file.name}" không được hỗ trợ. Chỉ chấp nhận ${ACCEPTED_EXTENSIONS.join(", ")}.`;
        } else if (codeErr?.code === "too-many-files") {
          message = `Chỉ được tải lên tối đa ${limits.maxFiles} file.`;
        }
        setError(message);
        toast.error(message);
        return;
      }

      if (acceptedFiles.length === 0) return;

      // Gộp với các file đã có để người dùng bổ sung dần từng tài liệu.
      const existingKeys = new Set(files.map(fileKey));
      const added = acceptedFiles.filter((f) => !existingKeys.has(fileKey(f)));
      if (added.length === 0) {
        toast.info("Các file này đã có trong danh sách.");
        return;
      }
      const merged = [...files, ...added];

      if (merged.length > limits.maxFiles) {
        const message = `Chỉ được tải lên tối đa ${limits.maxFiles} file (đang chọn ${merged.length}).`;
        setError(message);
        toast.error(message);
        return;
      }

      const totalBytes = merged.reduce((sum, f) => sum + f.size, 0);
      if (totalBytes > limits.maxTotalBytes) {
        const message = `Tổng dung lượng (${formatBytes(totalBytes)}) vượt quá giới hạn ${formatBytes(limits.maxTotalBytes)} mỗi lần tải lên.`;
        setError(message);
        toast.error(message);
        return;
      }

      void uploadFiles(merged);
    },
    [files, limits, uploadFiles],
  );

  function handleRemove(target: File) {
    const remaining = files.filter((f) => fileKey(f) !== fileKey(target));
    if (remaining.length === 0) {
      setFiles([]);
      onReset();
      return;
    }
    // Bóc tách lại phần còn lại để nội dung và vị trí trích dẫn khớp đúng
    // với danh sách file hiện tại.
    void uploadFiles(remaining);
  }

  function handleRemoveAll() {
    setFiles([]);
    onReset();
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: limits.maxFileBytes,
    maxFiles: limits.maxFiles,
    multiple: true,
    disabled: isUploading || files.length >= limits.maxFiles,
  });

  const isFull = files.length >= limits.maxFiles;

  return (
    <div className="space-y-3">
      {bundle && files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} tài liệu đã tải lên
            </p>
            <Button variant="ghost" size="sm" onClick={handleRemoveAll}>
              Xóa tất cả
            </Button>
          </div>
          <ul className="divide-y rounded-lg border">
            {bundle.sources.map((source) => {
              const file = files.find((f) => f.name === source.fileName);
              return (
                <li
                  key={source.fileName}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="size-6 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{source.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(source.sizeBytes)} ·{" "}
                        {source.fileType.toUpperCase()} ·{" "}
                        {source.wordCount.toLocaleString("vi-VN")} từ
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isUploading || !file}
                    onClick={() => file && handleRemove(file)}
                    aria-label={`Xóa ${source.fileName}`}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-accent"
            : "border-input hover:bg-accent/50",
          (isUploading || isFull) && "cursor-not-allowed opacity-70",
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <Loader2 className="size-9 animate-spin text-primary" />
        ) : (
          <UploadCloud className="size-9 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium">
            {isUploading
              ? "Đang phân tích tài liệu…"
              : isFull
                ? `Đã đạt giới hạn ${limits.maxFiles} file`
                : isDragActive
                  ? "Thả file vào đây"
                  : files.length > 0
                    ? "Kéo-thả thêm file, hoặc bấm để chọn"
                    : "Kéo-thả file vào đây, hoặc bấm để chọn file"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Hỗ trợ {ACCEPTED_EXTENSIONS.join(", ")} · tối đa {limits.maxFiles}{" "}
            file · mỗi file ≤ {formatBytes(limits.maxFileBytes)} · tổng ≤{" "}
            {formatBytes(limits.maxTotalBytes)}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
