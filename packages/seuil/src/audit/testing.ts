/** Test helpers: serve HTML fixtures from a temp folder and run a rule against them in real Chromium. */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import type { DataFlow, Finding } from "../results.js";
import { isLocalAddress } from "../privacy/geo.js";
import { serveDirectory, type StaticServer } from "./serve.js";
import type { Rule, RuleContext } from "./types.js";

export interface Harness {
  /** Same files, served under another host name (localhost instead of 127.0.0.1): a third party. */
  thirdParty: string;
  flows: DataFlow[];
  write(file: string, content: string): void;
  run(rule: Rule, html: string, context?: Partial<RuleContext>): Promise<Finding[]>;
  close(): Promise<void>;
}

/** A complete rule context with neutral defaults. */
export const testContext = (overrides: Partial<RuleContext> = {}): RuleContext => ({
  snapshotsDir: join(tmpdir(), "seuil-snapshots-unused"),
  updateSnapshots: false,
  firstParty: [],
  allowThirdParties: [],
  providers: [],
  geo: (ip) => (isLocalAddress(ip) ? "local" : undefined),
  recordFlow: () => undefined,
  ...overrides,
});

export const page = (body: string, head = "") =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Fixture</title>${head}</head><body><main>${body}</main></body></html>`;

export async function createHarness(options: { headers?: Record<string, string> } = {}): Promise<Harness> {
  const dir = mkdtempSync(join(tmpdir(), "seuil-audit-"));
  const server: StaticServer = await serveDirectory(dir, options.headers);
  const other: StaticServer = await serveDirectory(dir);
  const browser: Browser = await chromium.launch();
  const flows: DataFlow[] = [];
  let n = 0;
  return {
    thirdParty: other.url.replace("127.0.0.1", "localhost"),
    flows,
    write: (file, content) => writeFileSync(join(dir, file), content),
    async run(rule, html, context = {}) {
      const file = `fixture-${++n}.html`;
      writeFileSync(join(dir, file), html);
      const browserContext = await browser.newContext();
      try {
        const tab = await browserContext.newPage();
        return await rule.run(
          tab,
          { id: file, url: `${server.url}/${file}`, kind: "page" },
          testContext({ snapshotsDir: join(dir, "snapshots"), recordFlow: (flow) => flows.push(flow), ...context }),
        );
      } finally {
        await browserContext.close();
      }
    },
    async close() {
      await browser.close();
      await server.close();
      await other.close();
    },
  };
}
