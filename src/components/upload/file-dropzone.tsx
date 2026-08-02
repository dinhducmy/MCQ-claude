"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileText, UploadCloud, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  type ParsedDocument,
} from "@/lib/types";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    [".docx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

interface FileDropzoneProps {
  onParsed: (doc: ParsedDocument, file: File) => void;
  parsedDocument: ParsedDocument | null;
  onReset: () => void;
}

export function FileDropzone({
  onParsed,
  parsedDocument,
  onReset,
}: FileDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/parse", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Có lỗi xảy ra khi xử lý file.");
        }
        onParsed(data as ParsedDocument, file);
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
        const rejection = rejections[0];
        const codeErr = rejection.errors[0];
        let message = "File không hợp lệ.";
        if (codeErr?.code === "file-too-large") {
          message = "File vượt quá dung lượng tối đa 20 MB.";
        } else if (codeErr?.code === "file-invalid-type") {
          message =
            "Định dạng file không được hỗ trợ. Chỉ chấp nhận .pdf, .docx, .txt, .md.";
        } else if (codeErr?.code === "too-many-files") {
          message = "Chỉ được tải lên 1 file mỗi lần.";
        }
        setError(message);
        toast.error(message);
        return;
      }
      const file = acceptedFiles[0];
      if (file) {
        void uploadFile(file);
      }
    },
    [uploadFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: 1,
    multiple: false,
    disabled: isUploading || !!parsedDocument,
  });

  if (parsedDocument) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="flex min-w-0 items-center gap-3">
          <FileText className="size-8 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate font-medium">{parsedDocument.fileName}</p>
            <p className="text-sm text-muted-foreground">
              {(parsedDocument.sizeBytes / 1024 / 1024).toFixed(2)} MB ·{" "}
              {parsedDocument.fileType.toUpperCase()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onReset}
          aria-label="Xóa file, tải lên file khác"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
          isDragActive
            ? "border-primary bg-accent"
            : "border-input hover:bg-accent/50",
          (isUploading || !!parsedDocument) &&
            "cursor-not-allowed opacity-70",
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <Loader2 className="size-10 animate-spin text-primary" />
        ) : (
          <UploadCloud className="size-10 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium">
            {isUploading
              ? "Đang phân tích tài liệu…"
              : isDragActive
                ? "Thả file vào đây"
                : "Kéo-thả file vào đây, hoặc bấm để chọn file"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Hỗ trợ {ACCEPTED_EXTENSIONS.join(", ")} · tối đa 20 MB
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
