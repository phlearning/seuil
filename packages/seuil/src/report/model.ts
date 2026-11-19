/** Everything a report shows, computed once and rendered as HTML, Markdown or CSV. */
import type { DataFlow, Finding, Results } from "../results.js";
import type { CriteriaFile, Lang } from "../review/criteria.js";
import { computeCoverage, summarize, type CoverageSummary, type CriterionCoverage } from "../review/coverage.js";
import type { ReviewFile } from "../review/store.js";

export interface ReportModel {
  lang: Lang;
  client: string;
  generatedAt: string;
  tool: string;
  pages: string[];
  rules: string[];
  coverage: CriterionCoverage[];
  summary: CoverageSummary;
  ech: CoverageSummary;
  accessibility: Finding[];
  privacy: Finding[];
  security: Finding[];
  other: Finding[];
  dataFlows: DataFlow[];
  errors: string[];
  principles: CriteriaFile["principles"];
}

export function buildReport(results: Results, criteria: CriteriaFile, review: ReviewFile, options: { lang: Lang; client: string }): ReportModel {
  const coverage = computeCoverage(criteria.criteria, results, review);
  const byPrefix = (prefix: string) => results.findings.filter((f) => f.rule.startsWith(prefix));
  return {
    lang: options.lang,
    client: options.client,
    generatedAt: results.generatedAt,
    tool: results.tool ? `${results.tool.name} ${results.tool.version}` : "seuil",
    pages: (results.inventory ?? []).map((p) => p.url),
    rules: (results.scope?.rules ?? []).filter((r) => !r.startsWith("seuil/")),
    coverage,
    summary: summarize(coverage),
    ech: summarize(coverage.filter((c) => c.criterion.wcag21)),
    accessibility: [...byPrefix("a11y/"), ...byPrefix("tokens/")],
    privacy: byPrefix("privacy/"),
    security: byPrefix("security/"),
    other: results.findings.filter((f) => !/^(a11y|tokens|privacy|security)\//.test(f.rule)),
    dataFlows: results.dataFlows ?? [],
    errors: results.errors ?? [],
    principles: criteria.principles,
  };
}
