/** Shape of GET /api/state (see packages/seuil/src/review/server.ts). */
export type Lang = "fr" | "en";
export type Status = "auto-fail" | "to-review" | "reviewed-ok" | "reviewed-fail" | "not-applicable";
export type Verdict = "ok" | "fail" | "na";

export interface Finding {
  rule: string;
  severity: "error" | "warning";
  target: { id: string; theme?: string; selector?: string };
  message: string;
  suggestion?: string;
}

export interface Coverage {
  criterion: {
    id: string;
    level: "A" | "AA";
    principle: string;
    wcag21: boolean;
    title: Record<Lang, string>;
    checklist: Record<Lang, string>;
    checks: string[];
  };
  status: Status;
  failures: Finding[];
  warnings: Finding[];
  checksRun: string[];
  suggestNotApplicable: boolean;
  review?: { verdict: Verdict; comment: string; reviewer: string; at: string };
  stalePages: string[];
}

export interface Page {
  page: string;
  url: string;
  title: string;
  lang: string;
  headings: { level: number; text: string }[];
  landmarks: string[];
  images: { selector: string; alt: string | null; src: string }[];
  links: { text: string; href: string }[];
  fields: { selector: string; type: string; label: string; autocomplete: string; required: boolean }[];
  langParts: { lang: string; text: string }[];
  screenshot?: string;
}

export interface Summary {
  total: number;
  resolved: number;
  percent: number;
  failed: number;
  verdict: "compliant" | "non-compliant" | "incomplete";
}

export interface State {
  lang: Lang;
  reviewer: string;
  generatedAt: string;
  principles: Record<string, Record<Lang, string>>;
  summary: Summary;
  ech: Summary;
  coverage: Coverage[];
  inventory: Page[];
}
