import type { DocChunk, ScopeMode } from "@/lib/types";

export function filterChunksByScope(
  chunks: DocChunk[],
  scopeMode: ScopeMode,
  selectedSectionTitles: string[] | undefined,
): DocChunk[] {
  if (scopeMode === "all" || !selectedSectionTitles?.length) {
    return chunks;
  }
  const selectedSet = new Set(selectedSectionTitles);
  return chunks.filter((chunk) =>
    chunk.headingPath.some((heading) => selectedSet.has(heading)),
  );
}
