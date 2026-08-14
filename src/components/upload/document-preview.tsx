"use client";

import { Fragment } from "react";
import { AlertTriangle, FileStack, Files, ListTree, Type } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DocumentBundle } from "@/lib/types";

interface DocumentPreviewProps {
  bundle: DocumentBundle;
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

export function DocumentPreview({ bundle }: DocumentPreviewProps) {
  const multi = bundle.sources.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bản xem trước tài liệu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock
            icon={Files}
            label="Số tài liệu"
            value={`${bundle.sources.length}`}
          />
          <StatBlock
            icon={FileStack}
            label="Số trang"
            value={bundle.pageCount != null ? `${bundle.pageCount}` : "—"}
          />
          <StatBlock
            icon={Type}
            label="Số từ"
            value={
              bundle.wordCount ? bundle.wordCount.toLocaleString("vi-VN") : "—"
            }
          />
          <StatBlock
            icon={ListTree}
            label="Số đề mục"
            value={bundle.outline.length ? `${bundle.outline.length}` : "—"}
          />
        </div>

        {bundle.warnings.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <ul className="list-inside list-disc space-y-1">
              {bundle.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {bundle.outline.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Cấu trúc đề mục</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <ul className="divide-y">
                {bundle.outline.map((item, index) => {
                  const prevFile = bundle.outline[index - 1]?.sourceFile;
                  const showFileHeader =
                    multi && item.sourceFile !== prevFile;
                  return (
                    <Fragment key={item.id}>
                      {showFileHeader && (
                        <li className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                          {item.sourceFile}
                        </li>
                      )}
                      <li
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                        style={{
                          paddingLeft: `${0.75 + (item.level - 1) * 1}rem`,
                        }}
                      >
                        <span className="truncate">{item.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.location}
                        </span>
                      </li>
                    </Fragment>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
