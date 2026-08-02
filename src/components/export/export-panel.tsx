"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";

import type { MCQQuestion } from "@/lib/types";

type ExportType = "docx-teacher" | "docx-student" | "xlsx" | "csv";

interface ExportPanelProps {
  questions: MCQQuestion[];
  title: string;
}

const EXPORT_OPTIONS: {
  type: ExportType;
  label: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    type: "docx-teacher",
    label: "Bản giảng viên (.docx)",
    description: "Có đáp án và giải thích đầy đủ",
    icon: FileText,
  },
  {
    type: "docx-student",
    label: "Bản sinh viên (.docx)",
    description: "Chỉ câu hỏi và lựa chọn",
    icon: FileText,
  },
  {
    type: "xlsx",
    label: "Bảng tính (.xlsx)",
    description: "Toàn bộ dữ liệu dạng bảng",
    icon: FileSpreadsheet,
  },
  {
    type: "csv",
    label: "CSV (.csv)",
    description: "Dữ liệu thô, tương thích mọi hệ thống",
    icon: TableIcon,
  },
];

function extractFileName(
  contentDisposition: string | null,
  fallback: string,
): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="([^"]+)"/);
  return match ? match[1] : fallback;
}

export function ExportPanel({ questions, title }: ExportPanelProps) {
  const [loadingType, setLoadingType] = useState<ExportType | null>(null);

  async function handleExport(type: ExportType) {
    setLoadingType(type);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, questions, title }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Không thể xuất file.");
      }

      const blob = await res.blob();
      const fileName = extractFileName(
        res.headers.get("Content-Disposition"),
        `cau-hoi.${type.startsWith("docx") ? "docx" : type}`,
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Đã tải xuống ${fileName}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Có lỗi khi xuất file.";
      toast.error(message);
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {EXPORT_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isLoading = loadingType === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            onClick={() => handleExport(opt.type)}
            disabled={loadingType !== null || questions.length === 0}
            className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
            ) : (
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
            )}
            <span>
              <span className="block font-medium">{opt.label}</span>
              <span className="block text-sm text-muted-foreground">
                {opt.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
