import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import { BLOOM_LEVELS, type MCQQuestion } from "@/lib/types";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
  });
}

function bloomHeadingParagraph(level: string, count: number): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: `Mức ${level} (${count} câu)`, bold: true })],
  });
}

function questionStemParagraph(index: number, q: MCQQuestion): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({ text: `Câu ${index}. `, bold: true }),
      new TextRun({ text: q.stem }),
    ],
  });
}

function optionParagraph(
  key: (typeof OPTION_KEYS)[number],
  text: string,
  markCorrect: boolean,
): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text: `${key}. ${text}${markCorrect ? " (Đáp án đúng)" : ""}`,
        bold: markCorrect,
      }),
    ],
  });
}

function labelParagraph(label: string, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `${label}: `, italics: true, bold: true }),
      new TextRun({ text, italics: true }),
    ],
  });
}

function buildQuestionsBySortedLevel(
  questions: MCQQuestion[],
): { level: string; items: MCQQuestion[] }[] {
  return BLOOM_LEVELS.map((level) => ({
    level,
    items: questions.filter((q) => q.bloom_level === level),
  })).filter((group) => group.items.length > 0);
}

export async function buildTeacherDocx(
  questions: MCQQuestion[],
  documentTitle: string,
): Promise<Buffer> {
  const groups = buildQuestionsBySortedLevel(questions);
  const children: Paragraph[] = [
    titleParagraph(documentTitle),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Bản dành cho giảng viên — có đáp án và giải thích",
          italics: true,
        }),
      ],
    }),
  ];

  let globalIndex = 0;
  for (const group of groups) {
    children.push(bloomHeadingParagraph(group.level, group.items.length));
    for (const q of group.items) {
      globalIndex += 1;
      children.push(questionStemParagraph(globalIndex, q));
      for (const key of OPTION_KEYS) {
        children.push(
          optionParagraph(key, q.options[key], key === q.correct_answer),
        );
      }
      children.push(labelParagraph("Giải thích đáp án đúng", q.explanation_correct));
      for (const key of OPTION_KEYS) {
        if (key === q.correct_answer) continue;
        const explanation = q.explanations_incorrect[key];
        if (explanation) {
          children.push(labelParagraph(`Vì sao ${key} sai`, explanation));
        }
      }
      children.push(
        labelParagraph(
          "Trích dẫn",
          `"${q.citation.quote}" (${q.citation.location})`,
        ),
      );
      children.push(labelParagraph("Mục tiêu học tập", q.learning_objective));
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

export async function buildStudentDocx(
  questions: MCQQuestion[],
  documentTitle: string,
): Promise<Buffer> {
  const groups = buildQuestionsBySortedLevel(questions);
  const children: Paragraph[] = [
    titleParagraph(documentTitle),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "Bản dành cho sinh viên", italics: true }),
      ],
    }),
  ];

  let globalIndex = 0;
  for (const group of groups) {
    for (const q of group.items) {
      globalIndex += 1;
      children.push(questionStemParagraph(globalIndex, q));
      for (const key of OPTION_KEYS) {
        children.push(optionParagraph(key, q.options[key], false));
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
