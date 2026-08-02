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
import type { ParsedDocument } from "@/lib/types";

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

  const maxUnlockedStep = parsedDocument ? 2 : 1;

  function handleParsed(doc: ParsedDocument, file: File) {
    setParsedDocument(doc);
    setUploadedFile(file);
  }

  function handleReset() {
    setParsedDocument(null);
    setUploadedFile(null);
    setCurrentStep(1);
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

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Bước 2 · Cấu hình sinh câu hỏi</CardTitle>
            <CardDescription>
              Sẽ được triển khai ở bước tiếp theo.
            </CardDescription>
          </CardHeader>
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
        <Button
          disabled={currentStep >= maxUnlockedStep || currentStep >= 2}
          onClick={() =>
            setCurrentStep((s) => Math.min(maxUnlockedStep, s + 1))
          }
        >
          Tiếp tục
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
