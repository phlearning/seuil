import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serveDirectory, type StaticServer } from "../serve.js";
import { page, testContext } from "../testing.js";
import { namesRule, snapshotFile } from "./names.js";

// One stable target whose HTML changes between runs, as a story does between commits.
let dir: string;
let server: StaticServer;
let browser: Browser;
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "seuil-names-"));
  server = await serveDirectory(dir);
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser.close();
  await server.close();
});

const target = () => ({ id: "rdv", url: `${server.url}/rdv.html`, kind: "page" as const, theme: "sante" });

async function run(snapshotsDir: string, html: string, updateSnapshots = false) {
  writeFileSync(join(dir, "rdv.html"), html);
  const tab = await browser.newPage();
  try {
    return await namesRule.run(tab, target(), testContext({ snapshotsDir, updateSnapshots }));
  } finally {
    await tab.close();
  }
}

describe("a11y/names", () => {
  const named = page(`<button>Envoyer la demande</button>`);
  const unnamed = page(`<button><svg width="16" height="16"></svg></button>`);

  it("names the snapshot after the target and its theme", () => {
    expect(snapshotFile("/snaps", { id: "components--buttons", url: "", kind: "component", theme: "admin" })).toBe(
      "/snaps/components--buttons--admin.aria.yml",
    );
  });

  it("records a baseline, passes while nothing changes, warns on a lost name", async () => {
    const snapshotsDir = mkdtempSync(join(tmpdir(), "seuil-snap-"));
    expect(await run(snapshotsDir, named)).toEqual([]);
    expect(await run(snapshotsDir, named)).toEqual([]);

    const [finding] = await run(snapshotsDir, unnamed);
    expect(finding).toMatchObject({ rule: "a11y/names", severity: "warning", target: { id: "rdv", theme: "sante" } });
    expect(finding?.message).toContain('button "Envoyer la demande"');
  });

  it("accepts the new tree after --update-snapshots", async () => {
    const snapshotsDir = mkdtempSync(join(tmpdir(), "seuil-snap-"));
    await run(snapshotsDir, named);
    expect(await run(snapshotsDir, unnamed, true)).toEqual([]);
    expect(await run(snapshotsDir, unnamed)).toEqual([]);
  });
});
