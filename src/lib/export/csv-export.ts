import type { MCQQuestion } from "@/lib/types";
import { TABULAR_HEADERS, questionsToRows } from "@/lib/export/tabular-export";

const UTF8_BOM = "﻿";

function escapeCsvField(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(questions: MCQQuestion[]): string {
  const rows = [TABULAR_HEADERS, ...questionsToRows(questions)];
  const csvBody = rows
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\r\n");
  return UTF8_BOM + csvBody;
}
