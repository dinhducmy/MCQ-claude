"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuestionEditDialog } from "@/components/review/question-edit-dialog";
import { apiKeyHeaders } from "@/lib/client/api-key";
import {
  BLOOM_LEVELS,
  type AudienceValue,
  type BloomLevel,
  type DocChunk,
  type MCQQuestion,
} from "@/lib/types";

interface QuestionsTableProps {
  questions: MCQQuestion[];
  onChange: (questions: MCQQuestion[]) => void;
  chunks: DocChunk[];
  audience: AudienceValue;
}

export function QuestionsTable({
  questions,
  onChange,
  chunks,
  audience,
}: QuestionsTableProps) {
  const [filterLevel, setFilterLevel] = useState<BloomLevel | "all">("all");
  const [editingQuestion, setEditingQuestion] = useState<MCQQuestion | null>(
    null,
  );
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const filteredQuestions = useMemo(
    () =>
      filterLevel === "all"
        ? questions
        : questions.filter((q) => q.bloom_level === filterLevel),
    [questions, filterLevel],
  );

  function handleDelete(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }

  function handleSaveEdit(updated: MCQQuestion) {
    onChange(questions.map((q) => (q.id === updated.id ? updated : q)));
  }

  async function handleRegenerate(question: MCQQuestion) {
    setRegeneratingId(question.id);
    try {
      const avoidStems = questions
        .filter((q) => q.id !== question.id)
        .map((q) => q.stem);

      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiKeyHeaders() },
        body: JSON.stringify({
          chunks,
          bloomLevel: question.bloom_level,
          audience,
          avoidStems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể sinh lại câu hỏi.");
      }
      const newQuestion: MCQQuestion = { ...data.question, id: question.id };
      onChange(questions.map((q) => (q.id === question.id ? newQuestion : q)));
      toast.success("Đã sinh lại câu hỏi.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Có lỗi khi sinh lại câu hỏi.";
      toast.error(message);
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="w-48">
          <Select
            value={filterLevel}
            onValueChange={(v) => setFilterLevel(v as BloomLevel | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mức Bloom</SelectItem>
              {BLOOM_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredQuestions.length} / {questions.length} câu
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Mức</TableHead>
              <TableHead>Câu hỏi</TableHead>
              <TableHead className="w-20">Đáp án</TableHead>
              <TableHead className="w-32 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuestions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Không có câu hỏi nào.
                </TableCell>
              </TableRow>
            )}
            {filteredQuestions.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <Badge variant="secondary">{q.bloom_level}</Badge>
                </TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  <p className="line-clamp-2 text-sm">{q.stem}</p>
                </TableCell>
                <TableCell className="font-medium">{q.correct_answer}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Sửa"
                      onClick={() => setEditingQuestion(q)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Sinh lại"
                      disabled={regeneratingId === q.id}
                      onClick={() => handleRegenerate(q)}
                    >
                      {regeneratingId === q.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Xóa"
                      onClick={() => {
                        if (window.confirm("Xóa câu hỏi này?")) {
                          handleDelete(q.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <QuestionEditDialog
        question={editingQuestion}
        open={editingQuestion !== null}
        onOpenChange={(open) => {
          if (!open) setEditingQuestion(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
