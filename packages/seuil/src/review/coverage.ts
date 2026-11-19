import type { CriterionStatus, Finding, PageInventory, Results } from "../results.js";
import type { Criterion, Feature } from "./criteria.js";
import type { ReviewEntry, ReviewFile } from "./store.js";

export interface CriterionCoverage {
  criterion: Criterion;
  status: CriterionStatus;
  /** Automated errors citing this criterion. */
  failures: Finding[];
  /** Automated warnings citing it: things the reviewer should look at. */
  warnings: Finding[];
  /** Seuil rules that ran and test part of this criterion. */
  checksRun: string[];
  /** No audited page has the feature this criterion is about. */
  suggestNotApplicable: boolean;
  review?: ReviewEntry;
  /** Pages changed or added since the review: the review no longer counts. */
  stalePages: string[];
}

export interface CoverageSummary {
  total: number;
  resolved: number;
  percent: number;
  failed: number;
  verdict: "compliant" | "non-compliant" | "incomplete";
}

const FEATURE_PRESENT: Record<Feature, (p: PageInventory) => boolean> = {
  media: (p) => p.media > 0,
  forms: (p) => p.fields.length > 0,
  images: (p) => p.images.length > 0,
  links: (p) => p.links.length > 0,
  password: (p) => p.passwordFields > 0,
};

const citesCriterion = (f: Finding, id: string) => f.references.some((r) => r.standard === "WCAG 2.2" && r.id === id);

export function stalePages(entry: ReviewEntry, inventory: PageInventory[]): string[] {
  return inventory.filter((p) => entry.pages[p.page] !== p.hash).map((p) => p.page);
}

/**
 * Combines automated results and the human review, criterion by criterion.
 * An automated failure always wins: a reviewer cannot sign off a detected defect.
 * Nothing is "auto-ok": no automated rule proves a criterion on its own.
 */
export function computeCoverage(criteria: Criterion[], results: Results, review: ReviewFile): CriterionCoverage[] {
  const inventory = results.inventory ?? [];
  const rulesRun = new Set(results.scope?.rules ?? []);

  return criteria.map((criterion) => {
    const citing = results.findings.filter((f) => citesCriterion(f, criterion.id));
    const failures = citing.filter((f) => f.severity === "error");
    const warnings = citing.filter((f) => f.severity === "warning");
    const feature = criterion.notApplicableWithout;
    const suggestNotApplicable = feature !== null && inventory.length > 0 && !inventory.some(FEATURE_PRESENT[feature]);
    const entry = review.entries[criterion.id];
    const stale = entry ? stalePages(entry, inventory) : [];

    let status: CriterionStatus = "to-review";
    if (failures.length > 0) status = "auto-fail";
    else if (entry && stale.length === 0) status = entry.verdict === "ok" ? "reviewed-ok" : entry.verdict === "fail" ? "reviewed-fail" : "not-applicable";

    return {
      criterion,
      status,
      failures,
      warnings,
      checksRun: criterion.checks.filter((c) => rulesRun.has(c)),
      suggestNotApplicable,
      ...(entry && { review: entry }),
      stalePages: stale,
    };
  });
}

export function summarize(coverage: CriterionCoverage[]): CoverageSummary {
  const total = coverage.length;
  const resolved = coverage.filter((c) => c.status !== "to-review").length;
  const failed = coverage.filter((c) => c.status === "auto-fail" || c.status === "reviewed-fail").length;
  return {
    total,
    resolved,
    // Floor, so 54/55 never shows as 100 %.
    percent: total === 0 ? 0 : Math.floor((resolved / total) * 100),
    failed,
    verdict: failed > 0 ? "non-compliant" : resolved === total ? "compliant" : "incomplete",
  };
}
