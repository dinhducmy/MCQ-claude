import mammoth from "mammoth";
import * as cheerio from "cheerio";

import type { DocChunk, OutlineItem } from "@/lib/types";
import { buildChunks, buildOutline } from "@/lib/parsing/chunk";
import { countWords, type ContentUnit } from "@/lib/parsing/units";

export interface DocxParseResult {
  wordCount: number;
  outline: OutlineItem[];
  chunks: DocChunk[];
  warnings: string[];
}

const HEADING_TAGS: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

export async function parseDocx(buffer: Buffer): Promise<DocxParseResult> {
  const { value: html, messages } = await mammoth.convertToHtml({ buffer });

  const $ = cheerio.load(html);
  const units: ContentUnit[] = [];
  const headingStack: string[] = [];

  function currentLocation(): string {
    return headingStack.length > 0
      ? headingStack.join(" › ")
      : "Mở đầu tài liệu";
  }

  $("body")
    .children()
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      if (!tag) return;

      if (HEADING_TAGS[tag]) {
        const level = HEADING_TAGS[tag];
        const title = $(el).text().trim();
        if (!title) return;
        headingStack[level - 1] = title;
        headingStack.length = level;
        units.push({
          text: title,
          location: currentLocation(),
          headingPath: [...headingStack],
          isHeading: true,
          headingLevel: level,
        });
        return;
      }

      if (tag === "table") {
        $(el)
          .find("tr")
          .each((_, tr) => {
            const cells: string[] = [];
            $(tr)
              .find("td, th")
              .each((_, cell) => {
                const text = $(cell).text().trim();
                if (text) cells.push(text);
              });
            const rowText = cells.join(" | ");
            if (rowText) {
              units.push({
                text: rowText,
                location: currentLocation(),
                headingPath: [...headingStack],
                isHeading: false,
              });
            }
          });
        return;
      }

      if (tag === "ul" || tag === "ol") {
        $(el)
          .find("li")
          .each((_, li) => {
            const text = $(li).text().trim();
            if (text) {
              units.push({
                text: `- ${text}`,
                location: currentLocation(),
                headingPath: [...headingStack],
                isHeading: false,
              });
            }
          });
        return;
      }

      const text = $(el).text().trim();
      if (text) {
        units.push({
          text,
          location: currentLocation(),
          headingPath: [...headingStack],
          isHeading: false,
        });
      }
    });

  const fullText = units.map((u) => u.text).join(" ");
  const wordCount = countWords(fullText);

  const warnings = messages
    .filter((m) => m.type === "warning" || m.type === "error")
    .map((m) => m.message)
    .slice(0, 5);

  return {
    wordCount,
    outline: buildOutline(units),
    chunks: buildChunks(units),
    warnings,
  };
}
