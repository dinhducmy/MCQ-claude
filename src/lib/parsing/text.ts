import type { DocChunk, OutlineItem } from "@/lib/types";
import { buildChunks, buildOutline } from "@/lib/parsing/chunk";
import { detectHeading } from "@/lib/parsing/heading";
import { countWords, type ContentUnit } from "@/lib/parsing/units";

export interface TextParseResult {
  wordCount: number;
  outline: OutlineItem[];
  chunks: DocChunk[];
}

const MD_ATX = /^(#{1,6})\s+(.+)$/;

export function parseText(
  content: string,
  isMarkdown: boolean,
): TextParseResult {
  const lines = content.split(/\r?\n/);
  const units: ContentUnit[] = [];
  const headingStack: string[] = [];

  function currentLocation(): string {
    return headingStack.length > 0
      ? headingStack.join(" › ")
      : "Mở đầu tài liệu";
  }

  function pushHeading(level: number, title: string) {
    headingStack[level - 1] = title;
    headingStack.length = level;
    units.push({
      text: title,
      location: currentLocation(),
      headingPath: [...headingStack],
      isHeading: true,
      headingLevel: level,
    });
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isMarkdown) {
      const md = line.match(MD_ATX);
      if (md) {
        pushHeading(md[1].length, md[2].trim());
        continue;
      }
    }

    const heading = detectHeading(line);
    if (heading) {
      pushHeading(heading.level, heading.title);
      continue;
    }

    units.push({
      text: line,
      location: currentLocation(),
      headingPath: [...headingStack],
      isHeading: false,
    });
  }

  const wordCount = countWords(content);

  return {
    wordCount,
    outline: buildOutline(units),
    chunks: buildChunks(units),
  };
}
