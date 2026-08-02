"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MCQQuestion } from "@/lib/types";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

interface QuestionEditDialogProps {
  question: MCQQuestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: MCQQuestion) => void;
}

interface FormState {
  stem: string;
  options: Record<OptionKey, string>;
  correctAnswer: OptionKey;
  explanationCorrect: string;
  explanations: Record<OptionKey, string>;
  citationQuote: string;
  citationLocation: string;
  learningObjective: string;
}

function toFormState(q: MCQQuestion): FormState {
  return {
    stem: q.stem,
    options: { ...q.options },
    correctAnswer: q.correct_answer,
    explanationCorrect: q.explanation_correct,
    explanations: {
      A: q.explanations_incorrect.A ?? "",
      B: q.explanations_incorrect.B ?? "",
      C: q.explanations_incorrect.C ?? "",
      D: q.explanations_incorrect.D ?? "",
    },
    citationQuote: q.citation.quote,
    citationLocation: q.citation.location,
    learningObjective: q.learning_objective,
  };
}

export function QuestionEditDialog({
  question,
  open,
  onOpenChange,
  onSave,
}: QuestionEditDialogProps) {
  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <QuestionEditForm
        key={question.id}
        question={question}
        onCancel={() => onOpenChange(false)}
        onSave={(updated) => {
          onSave(updated);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}

interface QuestionEditFormProps {
  question: MCQQuestion;
  onCancel: () => void;
  onSave: (updated: MCQQuestion) => void;
}

function QuestionEditForm({ question, onCancel, onSave }: QuestionEditFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(question));

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const incorrectKeys = OPTION_KEYS.filter((k) => k !== form.correctAnswer);
    const updated: MCQQuestion = {
      ...question,
      stem: form.stem,
      options: form.options,
      correct_answer: form.correctAnswer,
      explanation_correct: form.explanationCorrect,
      explanations_incorrect: Object.fromEntries(
        incorrectKeys.map((k) => [k, form.explanations[k]]),
      ),
      citation: {
        quote: form.citationQuote,
        location: form.citationLocation,
      },
      learning_objective: form.learningObjective,
    };
    onSave(updated);
  }

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Sửa câu hỏi ({question.bloom_level})</DialogTitle>
        <DialogDescription>
          Chỉnh sửa trực tiếp nội dung, lựa chọn và giải thích của câu hỏi.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-stem">Nội dung câu hỏi</Label>
          <Textarea
            id="edit-stem"
            value={form.stem}
            onChange={(e) => updateForm("stem", e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTION_KEYS.map((key) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`edit-option-${key}`}>Lựa chọn {key}</Label>
              <Input
                id={`edit-option-${key}`}
                value={form.options[key]}
                onChange={(e) =>
                  updateForm("options", {
                    ...form.options,
                    [key]: e.target.value,
                  })
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-correct">Đáp án đúng</Label>
          <Select
            value={form.correctAnswer}
            onValueChange={(v) => updateForm("correctAnswer", v as OptionKey)}
          >
            <SelectTrigger id="edit-correct" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPTION_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-explanation-correct">
            Giải thích đáp án đúng
          </Label>
          <Textarea
            id="edit-explanation-correct"
            value={form.explanationCorrect}
            onChange={(e) => updateForm("explanationCorrect", e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Giải thích các phương án sai</p>
          {OPTION_KEYS.filter((k) => k !== form.correctAnswer).map((key) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`edit-explanation-${key}`}>
                Vì sao {key} sai
              </Label>
              <Textarea
                id={`edit-explanation-${key}`}
                value={form.explanations[key]}
                onChange={(e) =>
                  updateForm("explanations", {
                    ...form.explanations,
                    [key]: e.target.value,
                  })
                }
                rows={2}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="edit-citation-quote">Trích dẫn nguồn</Label>
            <Textarea
              id="edit-citation-quote"
              value={form.citationQuote}
              onChange={(e) => updateForm("citationQuote", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-citation-location">Vị trí</Label>
            <Input
              id="edit-citation-location"
              value={form.citationLocation}
              onChange={(e) => updateForm("citationLocation", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-objective">Mục tiêu học tập</Label>
          <Textarea
            id="edit-objective"
            value={form.learningObjective}
            onChange={(e) => updateForm("learningObjective", e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button onClick={handleSave}>Lưu thay đổi</Button>
      </DialogFooter>
    </DialogContent>
  );
}
