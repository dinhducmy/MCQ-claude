"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { DocumentPreview } from "@/components/upload/document-preview";
import { StepIndicator, type StepDef } from "@/components/workflow/step-indicator";
import {
  GenerationConfigForm,
  type GenerationRequestPayload,
} from "@/components/config/generation-config-form";
import { GenerationProgress } from "@/components/generate/generation-progress";
import { QuestionsTable } from "@/components/review/questions-table";
import { filterChunksByScope } from "@/lib/generation/filter-chunks";
import type { MCQQuestion, ParsedDocument } from "@/lib/types";

const STEPS: StepDef[] = [
  { id: 1, label: "Tải lên" },
  { id: 2, label: "Cấu hình" },
  { id: 3, label: "Sinh câu hỏi" },
  { id: 4, label: "Xem & sửa" },
  { id: 5, label: "Xuất file" },
];

export function AppShell() {
  const [currentStep, setCurrentStep] = useState(1);
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(
    null,
  );
  const [, setUploadedFile] = useState<File | null>(null);
  const [generationPayload, setGenerationPayload] =
    useState<GenerationRequestPayload | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[] | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const maxUnlockedStep = questions
    ? 4
    : generationPayload
      ? 3
      : parsedDocument
        ? 2
        : 1;

  function handleParsed(doc: ParsedDocument, file: File) {
    setParsedDocument(doc);
    setUploadedFile(file);
  }

  function handleReset() {
    setParsedDocument(null);
    setUploadedFile(null);
    setGenerationPayload(null);
    setQuestions(null);
    setGenerationError(null);
    setCurrentStep(1);
  }

  function handleConfigSubmit(payload: GenerationRequestPayload) {
    setGenerationError(null);
    setQuestions(null);
    setGenerationPayload(payload);
    setCurrentStep(3);
  }

  function handleGenerationComplete(result: MCQQuestion[]) {
    setQuestions(result);
  }

  function handleGenerationError(message: string) {
    setGenerationError(message);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Stethoscope className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight">
            Sinh câu hỏi trắc nghiệm y khoa theo thang Bloom
          </h1>
          <p className="text-sm text-muted-foreground">
            Tải tài liệu, cấu hình, sinh câu hỏi có trích dẫn, xem/sửa và xuất
            file
          </p>
        </div>
      </header>

      <Card>
        <CardContent>
          <StepIndicator
            steps={STEPS}
            currentStep={currentStep}
            maxUnlockedStep={maxUnlockedStep}
          />
        </CardContent>
      </Card>

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 1 · Tải lên tài liệu</CardTitle>
            <CardDescription>
              Kéo-thả 1 file .pdf, .docx, .txt hoặc .md, dung lượng tối đa
              20 MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileDropzone
              onParsed={handleParsed}
              parsedDocument={parsedDocument}
              onReset={handleReset}
            />
            {parsedDocument && <DocumentPreview doc={parsedDocument} />}
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && parsedDocument && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 2 · Cấu hình sinh câu hỏi</CardTitle>
            <CardDescription>
              Nhập số lượng câu hỏi cho từng mức Bloom, chọn đối tượng học và
              phạm vi nội dung.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GenerationConfigForm
              outline={parsedDocument.outline}
              onSubmit={handleConfigSubmit}
            />
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && parsedDocument && generationPayload && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 3 · Đang sinh câu hỏi</CardTitle>
            <CardDescription>
              Hệ thống sinh câu hỏi theo lô cho từng mức Bloom và xác minh
              trích dẫn tự động.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GenerationProgress
              key={JSON.stringify(generationPayload)}
              chunks={parsedDocument.chunks}
              payload={generationPayload}
              onComplete={handleGenerationComplete}
              onError={handleGenerationError}
            />
            {generationError && (
              <p className="text-sm text-destructive">{generationError}</p>
            )}
            {questions && (
              <Button onClick={() => setCurrentStep(4)}>
                Xem {questions.length} câu hỏi đã sinh
                <ArrowRight className="size-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && questions && parsedDocument && generationPayload && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 4 · Xem & sửa câu hỏi</CardTitle>
            <CardDescription>
              Đã sinh {questions.length} câu hỏi. Lọc theo mức Bloom, sửa trực
              tiếp, xóa hoặc sinh lại riêng từng câu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuestionsTable
              questions={questions}
              onChange={setQuestions}
              chunks={filterChunksByScope(
                parsedDocument.chunks,
                generationPayload.scopeMode,
                generationPayload.selectedSectionTitles,
              )}
              audience={generationPayload.audience}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentStep <= 1}
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
        {currentStep === 1 && (
          <Button
            disabled={!parsedDocument}
            onClick={() => setCurrentStep(2)}
          >
            Tiếp tục
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
