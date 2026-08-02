"use client";

import { AlertTriangle, FileStack, ListTree, Type } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ParsedDocument } from "@/lib/types";

interface DocumentPreviewProps {
  doc: ParsedDocument;
}

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Icon className="size-5 shrink-0 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function DocumentPreview({ doc }: DocumentPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bản xem trước tài liệu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatBlock
            icon={FileStack}
            label="Số trang"
            value={doc.pageCount != null ? `${doc.pageCount}` : "—"}
          />
          <StatBlock
            icon={Type}
            label="Số từ"
            value={doc.wordCount ? doc.wordCount.toLocaleString("vi-VN") : "—"}
          />
          <StatBlock
            icon={ListTree}
            label="Số đề mục"
            value={doc.outline.length ? `${doc.outline.length}` : "—"}
          />
        </div>

        {doc.warnings.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <ul className="list-inside list-disc space-y-1">
              {doc.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {doc.outline.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Cấu trúc đề mục</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <ul className="divide-y">
                {doc.outline.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    style={{ paddingLeft: `${0.75 + (item.level - 1) * 1}rem` }}
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.location}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
