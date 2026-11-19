/** Test helpers: serve HTML fixtures from a temp folder and run a rule against them in real Chromium. */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import type { Finding } from "../results.js";
import { serveDirectory, type StaticServer } from "./serve.js";
import type { Rule, RuleContext } from "./types.js";

export interface Harness {
  run(rule: Rule, html: string, context?: Partial<RuleContext>): Promise<Finding[]>;
  close(): Promise<void>;
}

export const page = (body: string, head = "") =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fixture</title>${head}</head><body><main>${body}</main></body></html>`;

export async function createHarness(): Promise<Harness> {
  const dir = mkdtempSync(join(tmpdir(), "seuil-audit-"));
  const server: StaticServer = await serveDirectory(dir);
  const browser: Browser = await chromium.launch();
  let n = 0;
  return {
    async run(rule, html, context = {}) {
      const file = `fixture-${++n}.html`;
      writeFileSync(join(dir, file), html);
      const browserContext = await browser.newContext();
      try {
        const tab = await browserContext.newPage();
        return await rule.run(tab, { id: file, url: `${server.url}/${file}`, kind: "page" }, {
          snapshotsDir: join(dir, "snapshots"),
          updateSnapshots: false,
          ...context,
        });
      } finally {
        await browserContext.close();
      }
    },
    async close() {
      await browser.close();
      await server.close();
    },
  };
}
