import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Results } from "../results.js";
import { loadCriteria } from "./criteria.js";
import { startReviewServer, type ReviewServer } from "./server.js";

let dir: string;
let server: ReviewServer;

const results: Results = {
  version: 1,
  generatedAt: "2026-11-20T00:00:00Z",
  findings: [],
  scope: { targets: 1, rules: [] },
  inventory: [{ page: "home", url: "http://x/", hash: "h1", title: "x", lang: "fr", headings: [], landmarks: [], images: [], links: [], fields: [], media: 0, passwordFields: 0, langParts: [] }],
};

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "seuil-review-srv-"));
  mkdirSync(join(dir, "ui"));
  mkdirSync(join(dir, "screens"));
  writeFileSync(join(dir, "ui", "index.html"), "<!doctype html><title>UI</title>");
  writeFileSync(join(dir, "screens", "home.png"), "png");
  writeFileSync(join(dir, "seuil-results.json"), JSON.stringify(results));
  server = await startReviewServer({
    resultsFile: join(dir, "seuil-results.json"),
    reviewFile: join(dir, "seuil-review.json"),
    criteria: loadCriteria(),
    uiDir: join(dir, "ui"),
    screenshotsDir: join(dir, "screens"),
    reviewer: "Marie Rochat",
    lang: "fr",
  });
});
afterEach(() => server.close());

const post = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${server.url}/api/review`, { method: "POST", headers: { "content-type": "application/json", origin: server.url, ...headers }, body: JSON.stringify(body) });

describe("review server", () => {
  it("serves the UI, screenshots and the current state", async () => {
    expect(await (await fetch(server.url)).text()).toContain("<title>UI</title>");
    expect(await (await fetch(`${server.url}/screens/home.png`)).text()).toBe("png");
    const state = await (await fetch(`${server.url}/api/state`)).json();
    expect(state.summary).toMatchObject({ total: 55, resolved: 0 });
  });

  it("refuses to serve files outside its folders", async () => {
    expect((await fetch(`${server.url}/screens/..%2Fseuil-results.json`)).status).toBe(403);
  });

  it("records a verdict with the reviewer and the page hashes, then clears it", async () => {
    const response = await post({ id: "1.3.3", verdict: "ok", comment: "Consignes en texte." });
    expect(response.status).toBe(200);
    const saved = JSON.parse(readFileSync(join(dir, "seuil-review.json"), "utf8"));
    expect(saved.entries["1.3.3"]).toMatchObject({ verdict: "ok", comment: "Consignes en texte.", reviewer: "Marie Rochat", pages: { home: "h1" } });
    expect((await response.json()).summary.resolved).toBe(1);

    await post({ id: "1.3.3", verdict: null });
    expect(JSON.parse(readFileSync(join(dir, "seuil-review.json"), "utf8")).entries).toEqual({});
  });

  it("rejects writes from another origin or without JSON", async () => {
    expect((await post({ id: "1.3.3", verdict: "ok" }, { origin: "https://evil.example" })).status).toBe(403);
    const form = await fetch(`${server.url}/api/review`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    expect(form.status).toBe(403);
  });

  it("rejects unknown criteria and verdicts", async () => {
    expect((await post({ id: "9.9.9", verdict: "ok" })).status).toBe(400);
    expect((await post({ id: "1.3.3", verdict: "maybe" })).status).toBe(400);
  });
});
