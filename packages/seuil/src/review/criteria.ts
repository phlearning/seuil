import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Lang = "fr" | "en";
export type Feature = "media" | "forms" | "images" | "links" | "password";

export interface Criterion {
  id: string;
  level: "A" | "AA";
  principle: "1" | "2" | "3" | "4";
  /** Already in WCAG 2.1, hence required by eCH-0059 v3.0. */
  wcag21: boolean;
  title: Record<Lang, string>;
  checks: string[];
  notApplicableWithout: Feature | null;
  checklist: Record<Lang, string>;
}

export interface CriteriaFile {
  sources: { wcag: string; fr: string; ech0059: string };
  principles: Record<string, Record<Lang, string>>;
  criteria: Criterion[];
}

const RELATIVE = "data/wcag/criteria.json";

export function loadCriteria(): CriteriaFile {
  const candidates: string[] = [];
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    candidates.push(join(dir, RELATIVE));
    if (dirname(dir) === dir) break;
  }
  candidates.push(join(dirname(fileURLToPath(import.meta.url)), "../../../..", RELATIVE));
  const file = candidates.find((f) => existsSync(f));
  if (!file) throw new Error(`WCAG reference data not found (${RELATIVE}).`);
  return JSON.parse(readFileSync(file, "utf8")) as CriteriaFile;
}
