/**
 * Local server behind `seuil review`. Bound to 127.0.0.1; writes refuse requests whose
 * Host or Origin is not this server, so no other website can submit a review.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, resolve, sep } from "node:path";
import type { Results } from "../results.js";
import { computeCoverage, summarize } from "./coverage.js";
import type { CriteriaFile, Lang } from "./criteria.js";
import { loadReview, saveReview, type ReviewVerdict } from "./store.js";

export interface ReviewServerOptions {
  resultsFile: string;
  reviewFile: string;
  criteria: CriteriaFile;
  uiDir: string;
  screenshotsDir: string;
  reviewer: string;
  lang: Lang;
  port?: number;
}

export interface ReviewServer {
  url: string;
  close(): Promise<void>;
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

/** Serves a file from inside root only. */
function sendFile(res: ServerResponse, root: string, relative: string): void {
  const base = resolve(root);
  let file = normalize(join(base, relative));
  if (file !== base && !file.startsWith(base + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(res);
}

const json = (res: ServerResponse, status: number, body: unknown) =>
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }).end(JSON.stringify(body));

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 64_000) throw new Error("Body too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** What the review UI shows; readOnly is set for the static export on the showcase. */
export function reviewState(options: Pick<ReviewServerOptions, "resultsFile" | "reviewFile" | "criteria" | "reviewer" | "lang">, readOnly = false) {
  const results = JSON.parse(readFileSync(options.resultsFile, "utf8")) as Results;
  const review = loadReview(options.reviewFile);
  const coverage = computeCoverage(options.criteria.criteria, results, review);
  return {
    lang: options.lang,
    reviewer: options.reviewer,
    readOnly,
    generatedAt: results.generatedAt,
    principles: options.criteria.principles,
    summary: summarize(coverage),
    ech: summarize(coverage.filter((c) => c.criterion.wcag21)),
    coverage,
    inventory: results.inventory ?? [],
  };
}

export async function startReviewServer(options: ReviewServerOptions): Promise<ReviewServer> {
  const readResults = () => JSON.parse(readFileSync(options.resultsFile, "utf8")) as Results;
  const state = () => reviewState(options);

  let origin = "";
  const server: Server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname === "/api/state" && req.method === "GET") return json(res, 200, state());

      if (url.pathname === "/api/review" && req.method === "POST") {
        // Same-origin and JSON only: blocks cross-site form posts and DNS rebinding.
        const sameHost = req.headers.host === new URL(origin).host;
        const sameOrigin = req.headers.origin === undefined || req.headers.origin === origin;
        if (!sameHost || !sameOrigin || !(req.headers["content-type"] ?? "").startsWith("application/json")) return json(res, 403, { error: "Forbidden" });

        const body = (await readBody(req)) as { id?: string; verdict?: ReviewVerdict | null; comment?: string };
        const criterion = options.criteria.criteria.find((c) => c.id === body.id);
        if (!criterion) return json(res, 400, { error: "Unknown criterion" });
        const review = loadReview(options.reviewFile);
        if (body.verdict === null) {
          delete review.entries[criterion.id];
        } else {
          if (body.verdict !== "ok" && body.verdict !== "fail" && body.verdict !== "na") return json(res, 400, { error: "verdict must be ok, fail, na or null" });
          const inventory = readResults().inventory ?? [];
          review.entries[criterion.id] = {
            verdict: body.verdict,
            comment: String(body.comment ?? "").slice(0, 4000),
            reviewer: options.reviewer,
            at: new Date().toISOString(),
            pages: Object.fromEntries(inventory.map((p) => [p.page, p.hash])),
          };
        }
        saveReview(options.reviewFile, review);
        return json(res, 200, state());
      }

      if (url.pathname.startsWith("/screens/") && req.method === "GET") return sendFile(res, options.screenshotsDir, decodeURIComponent(url.pathname.slice("/screens/".length)));
      if (req.method === "GET") return sendFile(res, options.uiDir, decodeURIComponent(url.pathname));
      res.writeHead(405).end();
    } catch (error) {
      json(res, 400, { error: (error as Error).message });
    }
  });

  await new Promise<void>((done) => server.listen(options.port ?? 0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url: origin, close: () => new Promise((done) => server.close(() => done())) };
}
