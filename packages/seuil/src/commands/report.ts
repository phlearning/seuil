import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Results } from "../results.js";
import { loadCriteria, type Lang } from "../review/criteria.js";
import { loadReview } from "../review/store.js";
import { buildReport } from "../report/model.js";
import { renderCsv, renderHtml, renderMarkdown } from "../report/render.js";
import type { CommandOutcome } from "./tokens.js";

export interface ReportOptions {
  results: string;
  format: "html" | "md" | "csv";
  lang: Lang;
  client: string;
  /** Default: seuil-review.json next to the results file. */
  review?: string;
  /** Default: print to standard output. */
  output?: string;
}

export function reportCommand(options: ReportOptions): CommandOutcome {
  try {
    if (!["html", "md", "csv"].includes(options.format)) return { code: 2, output: `Unknown format ${options.format}: use html, md or csv.` };
    if (!["fr", "en"].includes(options.lang)) return { code: 2, output: `Unknown language ${options.lang}: use fr or en.` };
    if (!existsSync(options.results)) return { code: 2, output: `Results file not found: ${options.results}. Run seuil check first.` };

    const results = JSON.parse(readFileSync(options.results, "utf8")) as Results;
    const review = loadReview(options.review ?? join(dirname(options.results), "seuil-review.json"));
    const model = buildReport(results, loadCriteria(), review, { lang: options.lang, client: options.client });
    const rendered = options.format === "html" ? renderHtml(model) : options.format === "md" ? renderMarkdown(model) : renderCsv(model);

    if (options.output) {
      mkdirSync(dirname(options.output), { recursive: true });
      writeFileSync(options.output, rendered);
      return { code: 0, output: `Report written to ${options.output} (${model.summary.resolved}/${model.summary.total} criteria assessed, ${model.summary.verdict}).` };
    }
    return { code: 0, output: rendered };
  } catch (error) {
    return { code: 2, output: `seuil report: ${(error as Error).message}` };
  }
}
