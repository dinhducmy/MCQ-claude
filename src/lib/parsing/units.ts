export interface ContentUnit {
  text: string;
  location: string;
  headingPath: string[];
  isHeading: boolean;
  headingLevel?: number;
  page?: number;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
