import * as XLSX from "xlsx";

import type { MCQQuestion } from "@/lib/types";
import { TABULAR_HEADERS, questionsToRows } from "@/lib/export/tabular-export";

export function buildXlsxBuffer(questions: MCQQuestion[]): Buffer {
  const rows = [TABULAR_HEADERS, ...questionsToRows(questions)];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = TABULAR_HEADERS.map((_, i) =>
    i === 2 ? { wch: 60 } : { wch: 22 },
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Câu hỏi");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  return buffer as Buffer;
}
