import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.js";
import { loadCriteria, type Lang } from "../review/criteria.js";
import { reviewState, startReviewServer, type ReviewServer } from "../review/server.js";
import { loadReview } from "../review/store.js";

export interface ReviewOptions {
  results: string;
  config: string;
  review?: string;
  reviewer?: string;
  port: number;
  lang: Lang;
  /** Write a static, read-only copy (UI, state, screenshots) to this folder instead of serving. */
  export?: string;
}

/** packages/review/dist next to this package in the monorepo, or SEUIL_REVIEW_UI. */
function findUi(): string | undefined {
  const candidates = [process.env.SEUIL_REVIEW_UI, join(dirname(fileURLToPath(import.meta.url)), "../../../review/dist")].filter((c): c is string => !!c);
  return candidates.find((c) => existsSync(join(c, "index.html")));
}

function gitUserName(): string | undefined {
  try {
    return execFileSync("git", ["config", "user.name"], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function reviewCommand(options: ReviewOptions): Promise<{ server?: ReviewServer; message: string; code: 0 | 2 }> {
  const results = resolve(options.results);
  if (!existsSync(results)) return { code: 2, message: `Results file not found: ${results}. Run seuil check first.` };
  const ui = findUi();
  if (!ui) return { code: 2, message: "Review UI not built: run pnpm --filter @seuil/review build." };
  if (options.export) {
    const reviewFile = resolve(options.review ?? join(dirname(results), "seuil-review.json"));
    const entries = Object.values(loadReview(reviewFile).entries);
    const config = loadConfig(options.config, { required: options.config !== "seuil.config.json" });
    const state = reviewState(
      { resultsFile: results, reviewFile, criteria: loadCriteria(), reviewer: options.reviewer ?? entries[0]?.reviewer ?? "", lang: options.lang },
      true,
    );
    const out = resolve(options.export);
    cpSync(ui, out, { recursive: true });
    mkdirSync(join(out, "api"), { recursive: true });
    writeFileSync(join(out, "api", "state"), JSON.stringify(state));
    mkdirSync(join(out, "screens"), { recursive: true });
    for (const page of state.inventory) {
      const shot = page.screenshot && join(config.audit.screenshots, page.screenshot);
      if (shot && existsSync(shot)) copyFileSync(shot, join(out, "screens", page.screenshot!));
    }
    return { code: 0, message: `Read-only review exported to ${out} (${state.summary.resolved}/${state.summary.total} criteria).` };
  }

  const reviewer = options.reviewer ?? gitUserName();
  if (!reviewer) return { code: 2, message: "Who is reviewing? Pass --reviewer \"First Last\" (or set git config user.name)." };

  const config = loadConfig(options.config, { required: options.config !== "seuil.config.json" });
  const server = await startReviewServer({
    resultsFile: results,
    reviewFile: resolve(options.review ?? join(dirname(results), "seuil-review.json")),
    criteria: loadCriteria(),
    uiDir: ui,
    screenshotsDir: config.audit.screenshots,
    reviewer,
    lang: options.lang,
    port: options.port,
  });
  return { code: 0, server, message: `Guided review open at ${server.url} (reviewer: ${reviewer}). Press Ctrl+C to stop.` };
}
