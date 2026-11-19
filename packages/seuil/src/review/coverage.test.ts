import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Finding, PageInventory, Results } from "../results.js";
import { loadCriteria } from "./criteria.js";
import { computeCoverage, summarize } from "./coverage.js";
import { loadReview, saveReview, type ReviewEntry, type ReviewFile } from "./store.js";

const { criteria } = loadCriteria();
const byId = (id: string) => criteria.filter((c) => c.id === id);

const inventoryPage = (page: string, hash: string, extra: Partial<PageInventory> = {}): PageInventory => ({
  page,
  url: `http://x/${page}`,
  hash,
  title: page,
  lang: "fr",
  headings: [],
  landmarks: ["main"],
  images: [],
  links: [],
  fields: [],
  media: 0,
  passwordFields: 0,
  langParts: [],
  ...extra,
});

const finding = (severity: Finding["severity"], wcag: string): Finding => ({
  rule: "a11y/keyboard",
  severity,
  target: { kind: "page", id: "home" },
  message: "x",
  references: [{ standard: "WCAG 2.2", id: wcag }],
});

const results = (findings: Finding[], inventory: PageInventory[]): Results => ({
  version: 1,
  generatedAt: "2026-11-20T00:00:00Z",
  findings,
  scope: { targets: inventory.length, rules: ["a11y/keyboard", "a11y/axe"] },
  inventory,
});

const entry = (verdict: ReviewEntry["verdict"], pages: Record<string, string>): ReviewEntry => ({ verdict, comment: "", reviewer: "R", at: "2026-11-20", pages });
const review = (entries: Record<string, ReviewEntry>): ReviewFile => ({ version: 1, entries });

describe("reference data", () => {
  it("has the 55 WCAG 2.2 A and AA criteria, 49 of them in eCH-0059 (WCAG 2.1)", () => {
    expect(criteria).toHaveLength(55);
    expect(criteria.filter((c) => c.wcag21)).toHaveLength(49);
    expect(new Set(criteria.map((c) => c.id)).size).toBe(55);
    expect(criteria.find((c) => c.id === "4.1.1")).toBeUndefined();
  });
});

describe("computeCoverage", () => {
  const home = [inventoryPage("home", "h1")];

  it("leaves a criterion to review when automated checks found nothing", () => {
    const [c] = computeCoverage(byId("2.4.7"), results([], home), review({}));
    expect(c).toMatchObject({ status: "to-review", checksRun: ["a11y/keyboard"], failures: [] });
  });

  it("fails a criterion on an automated error, even if a reviewer said ok", () => {
    const [c] = computeCoverage(byId("2.4.7"), results([finding("error", "2.4.7")], home), review({ "2.4.7": entry("ok", { home: "h1" }) }));
    expect(c?.status).toBe("auto-fail");
  });

  it("does not fail on a warning, but shows it to the reviewer", () => {
    const [c] = computeCoverage(byId("2.4.3"), results([finding("warning", "2.4.3")], home), review({}));
    expect(c).toMatchObject({ status: "to-review" });
    expect(c?.warnings).toHaveLength(1);
  });

  it("uses the review while the pages are unchanged", () => {
    const cov = computeCoverage([...byId("1.3.3"), ...byId("2.1.4"), ...byId("1.2.2")], results([], home), review({
      "1.3.3": entry("ok", { home: "h1" }),
      "2.1.4": entry("fail", { home: "h1" }),
      "1.2.2": entry("na", { home: "h1" }),
    }));
    expect(cov.map((c) => c.status)).toEqual(["reviewed-ok", "reviewed-fail", "not-applicable"]);
  });

  it("sends a review back to review when a page changed or was added", () => {
    const changed = computeCoverage(byId("1.3.3"), results([], [inventoryPage("home", "h2")]), review({ "1.3.3": entry("ok", { home: "h1" }) }));
    expect(changed[0]).toMatchObject({ status: "to-review", stalePages: ["home"] });
    const added = computeCoverage(byId("1.3.3"), results([], [inventoryPage("home", "h1"), inventoryPage("contact", "c1")]), review({ "1.3.3": entry("ok", { home: "h1" }) }));
    expect(added[0]).toMatchObject({ status: "to-review", stalePages: ["contact"] });
  });

  it("suggests not applicable for media criteria when no page has media, not otherwise", () => {
    expect(computeCoverage(byId("1.2.2"), results([], home), review({}))[0]?.suggestNotApplicable).toBe(true);
    expect(computeCoverage(byId("1.2.2"), results([], [inventoryPage("home", "h1", { media: 1 })]), review({}))[0]?.suggestNotApplicable).toBe(false);
    expect(computeCoverage(byId("2.4.7"), results([], home), review({}))[0]?.suggestNotApplicable).toBe(false);
  });
});

describe("summarize", () => {
  it("is incomplete until every criterion is resolved, and never rounds up to 100", () => {
    const cov = computeCoverage(criteria, results([], [inventoryPage("home", "h1")]), review(
      Object.fromEntries(criteria.slice(0, 54).map((c) => [c.id, entry("ok", { home: "h1" })])),
    ));
    expect(summarize(cov)).toMatchObject({ total: 55, resolved: 54, percent: 98, verdict: "incomplete" });
  });

  it("is compliant only when everything is resolved without failure", () => {
    const all = review(Object.fromEntries(criteria.map((c) => [c.id, entry("ok", { home: "h1" })])));
    expect(summarize(computeCoverage(criteria, results([], [inventoryPage("home", "h1")]), all))).toMatchObject({ percent: 100, verdict: "compliant" });
    expect(summarize(computeCoverage(criteria, results([finding("error", "1.4.3")], [inventoryPage("home", "h1")]), all)).verdict).toBe("non-compliant");
  });
});

describe("review file", () => {
  it("round-trips with sorted keys and starts empty", () => {
    const file = join(mkdtempSync(join(tmpdir(), "seuil-review-")), "seuil-review.json");
    expect(loadReview(file)).toEqual({ version: 1, entries: {} });
    saveReview(file, review({ "2.4.10": entry("na", {}), "1.4.3": entry("ok", {}), "2.4.2": entry("ok", {}) }));
    expect(Object.keys(loadReview(file).entries)).toEqual(["1.4.3", "2.4.2", "2.4.10"]);
  });
});
