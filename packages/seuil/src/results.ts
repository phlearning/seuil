/**
 * Normalised result format shared by every check (SPEC section 4).
 * seuil-results.json is the single source for every output format.
 */

export type Severity = "error" | "warning";

export type TargetKind = "token" | "component" | "page" | "dependency";

export interface Target {
  kind: TargetKind;
  /** Token path, Storybook story id or page URL. */
  id: string;
  /** Design system theme the target was checked in. */
  theme?: string;
  /** CSS selector of the offending element, when there is one. */
  selector?: string;
  /** Short HTML excerpt, kept so a future AI layer has the context it needs. */
  snippet?: string;
}

export interface Reference {
  /** e.g. "WCAG 2.2", "eCH-0059 v3.0", "nLPD". */
  standard: string;
  /** e.g. "1.4.3", "art. 16". */
  id: string;
  url?: string;
}

export interface Finding {
  /** Rule id, e.g. "tokens/contrast", "a11y/keyboard". */
  rule: string;
  severity: Severity;
  target: Target;
  message: string;
  references: Reference[];
  suggestion?: string;
}

/** Status of one WCAG criterion in the final report (SPEC section 4.3). */
export type CriterionStatus =
  | "auto-ok"
  | "auto-fail"
  | "to-review"
  | "reviewed-ok"
  | "reviewed-fail"
  | "not-applicable";

/** One row of the data-flow register handed to the client's DPO (SPEC 4.4). */
export interface DataFlow {
  /** Page (or story) where the flow was observed. */
  target: string;
  host: string;
  provider?: { id: string; name: string; company: string; country: string; cloudAct: boolean; category: string };
  serverIp?: string;
  /** ISO code, "local", or undefined when unknown. */
  serverCountry?: string;
  resourceTypes: string[];
  /** Data that leaves the browser with these requests. */
  data: string[];
  beforeInteraction: boolean;
  allowed: boolean;
  /** Swiss FADP / nLPD articles to look at for this flow. */
  nlpd: string[];
}

export interface Results {
  version: 1;
  generatedAt: string;
  findings: Finding[];
  /** What was checked, so a report can state its scope. */
  scope?: { targets: number; rules: string[] };
  /** Checks that could not run: the results are incomplete. */
  errors?: string[];
  /** Data-flow register (third parties contacted). */
  dataFlows?: DataFlow[];
}

export function exitCode(results: Results, failOn: Severity = "error"): 0 | 1 | 2 {
  if (results.errors && results.errors.length > 0) return 2;
  const blocking = results.findings.some(
    (f) => f.severity === "error" || (failOn === "warning" && f.severity === "warning"),
  );
  return blocking ? 1 : 0;
}
