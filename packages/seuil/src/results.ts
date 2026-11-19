/**
 * Normalised result format shared by every check (SPEC section 4).
 * seuil-results.json is the single source for every output format.
 */

export type Severity = "error" | "warning";

export type TargetKind = "token" | "component" | "page";

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

export interface Results {
  version: 1;
  generatedAt: string;
  findings: Finding[];
}

export function exitCode(results: Results, failOn: Severity = "error"): 0 | 1 {
  const blocking = results.findings.some(
    (f) => f.severity === "error" || (failOn === "warning" && f.severity === "warning"),
  );
  return blocking ? 1 : 0;
}
