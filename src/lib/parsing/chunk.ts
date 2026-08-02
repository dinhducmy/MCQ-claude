import type { DocChunk, OutlineItem } from "@/lib/types";
import { countWords, type ContentUnit } from "@/lib/parsing/units";

const TARGET_CHUNK_CHARS = 1800;

export function buildOutline(units: ContentUnit[]): OutlineItem[] {
  const outline: OutlineItem[] = [];
  units.forEach((unit, idx) => {
    if (unit.isHeading) {
      outline.push({
        id: `h-${idx}`,
        level: unit.headingLevel ?? 1,
        title: unit.text,
        location: unit.location,
      });
    }
  });
  return outline;
}

export function buildChunks(units: ContentUnit[]): DocChunk[] {
  const chunks: DocChunk[] = [];
  let buffer: string[] = [];
  let bufferChars = 0;
  let bufferLocations: string[] = [];
  let bufferHeadingPath: string[] = [];
  let bufferStartPage: number | undefined;
  let bufferEndPage: number | undefined;
  let chunkIndex = 0;

  function flush() {
    if (buffer.length === 0) return;
    const text = buffer.join("\n").trim();
    if (!text) {
      buffer = [];
      bufferChars = 0;
      bufferLocations = [];
      return;
    }
    const dedupLocations = bufferLocations.filter(
      (loc, i) => i === 0 || loc !== bufferLocations[i - 1],
    );
    const location =
      dedupLocations.length <= 1
        ? dedupLocations[0] || "Không rõ vị trí"
        : `${dedupLocations[0]} – ${dedupLocations[dedupLocations.length - 1]}`;

    chunks.push({
      id: `chunk-${chunkIndex}`,
      index: chunkIndex,
      text,
      location,
      startPage: bufferStartPage,
      endPage: bufferEndPage,
      headingPath: bufferHeadingPath,
      wordCount: countWords(text),
    });
    chunkIndex += 1;
    buffer = [];
    bufferChars = 0;
    bufferLocations = [];
    bufferStartPage = undefined;
    bufferEndPage = undefined;
  }

  for (const unit of units) {
    const unitText = unit.text.trim();
    if (!unitText) continue;

    if (bufferChars > 0 && bufferChars + unitText.length > TARGET_CHUNK_CHARS) {
      flush();
    }

    if (buffer.length === 0) {
      bufferHeadingPath = unit.headingPath;
      bufferStartPage = unit.page;
    }
    buffer.push(unitText);
    bufferChars += unitText.length + 1;
    bufferLocations.push(unit.location);
    bufferEndPage = unit.page ?? bufferEndPage;
  }
  flush();

  return chunks;
}
