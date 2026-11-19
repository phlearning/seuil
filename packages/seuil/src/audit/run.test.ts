import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { headersRule } from "./rules/headers.js";
import { consentRule } from "./rules/privacy.js";
import { runAudit } from "./run.js";
import { serveDirectory } from "./serve.js";
import { page, testContext } from "./testing.js";

const HEADERS = {
  "content-security-policy": "default-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=()",
  "cache-control": "no-cache",
  etag: 'W/"fixed"',
};

describe("runAudit isolation", () => {
  it("sees the real headers on every check of the same URL, not a cached 304", async () => {
    // Like vite preview: a revalidation gets a bare 304, without the security headers.
    const html = page(`<h1>ok</h1>`);
    const server = createServer((req, res) => {
      if (req.headers["if-none-match"] === HEADERS.etag) res.writeHead(304, { etag: HEADERS.etag }).end();
      else res.writeHead(200, { ...HEADERS, "content-type": "text/html" }).end(html);
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
    try {
      const target = { id: "home", url, kind: "page" as const };
      // Same URL three times, one worker: the old shared context answered from cache after the first load.
      const run = await runAudit([target, target, target], [headersRule], testContext(), { concurrency: 1 });
      expect(run.errors).toEqual([]);
      expect(run.findings.filter((f) => f.target.selector === "content-security-policy" && f.message.startsWith("No Content"))).toEqual([]);
    } finally {
      await new Promise((done) => server.close(done));
    }
  });

  it("does not carry cookies from one page into the next page's consent check", async () => {
    const dir = mkdtempSync(join(tmpdir(), "seuil-run-"));
    writeFileSync(join(dir, "tracker.html"), page(`<h1>a</h1>`, `<script>document.cookie = "_ga=GA1.1.1; path=/";</script>`));
    writeFileSync(join(dir, "clean.html"), page(`<h1>b</h1>`));
    const server = await serveDirectory(dir);
    try {
      const run = await runAudit(
        [
          { id: "tracker", url: `${server.url}/tracker.html`, kind: "page" },
          { id: "clean", url: `${server.url}/clean.html`, kind: "page" },
        ],
        [consentRule],
        testContext(),
        { concurrency: 1 },
      );
      expect(run.findings.map((f) => f.target.id)).toEqual(["tracker"]);
    } finally {
      await server.close();
    }
  });
});
