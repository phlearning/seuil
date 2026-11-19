/** seuil-review.json: the human half of the audit, committed next to the code so it is traceable. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export type ReviewVerdict = "ok" | "fail" | "na";

export interface ReviewEntry {
  verdict: ReviewVerdict;
  comment: string;
  reviewer: string;
  /** ISO date of the review. */
  at: string;
  /** Hash of each page as it was reviewed: a later change makes the entry stale. */
  pages: Record<string, string>;
}

export interface ReviewFile {
  version: 1;
  entries: Record<string, ReviewEntry>;
}

export function loadReview(file: string): ReviewFile {
  if (!existsSync(file)) return { version: 1, entries: {} };
  const parsed = JSON.parse(readFileSync(file, "utf8")) as ReviewFile;
  if (parsed.version !== 1 || typeof parsed.entries !== "object") throw new Error(`${file} is not a Seuil review file`);
  return parsed;
}

export function saveReview(file: string, review: ReviewFile): void {
  // Sorted keys keep diffs small and readable in pull requests.
  const entries = Object.fromEntries(Object.entries(review.entries).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })));
  writeFileSync(file, JSON.stringify({ version: 1, entries }, null, 2) + "\n");
}
