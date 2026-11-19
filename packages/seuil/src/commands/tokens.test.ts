import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { tokensCommand } from "./tokens.js";

const repoRoot = resolve(import.meta.dirname, "../../../..");

function fixture(mutedAdmin: string) {
  const dir = mkdtempSync(join(tmpdir(), "seuil-cmd-"));
  mkdirSync(join(dir, "tokens", "themes"), { recursive: true });
  writeFileSync(join(dir, "tokens", "base.tokens.json"), "{}");
  const theme = (muted: string) =>
    JSON.stringify({ color: { $type: "color", bg: { default: { $value: "#ffffff" } }, text: { muted: { $value: muted } } } });
  writeFileSync(join(dir, "tokens", "themes", "sante.tokens.json"), theme("#4a5a63"));
  writeFileSync(join(dir, "tokens", "themes", "admin.tokens.json"), theme(mutedAdmin));
  writeFileSync(
    join(dir, "seuil.config.json"),
    JSON.stringify({ tokens: { path: "tokens", themes: ["sante", "admin"], pairs: [["color.text.muted", "color.bg.default"]] } }),
  );
  return dir;
}

describe("tokensCommand", () => {
  it("passes on the repository's own design tokens", () => {
    const outcome = tokensCommand({ config: join(repoRoot, "seuil.config.json") });
    expect(outcome.output).toContain("0 failing");
    expect(outcome.code).toBe(0);
  });

  it("fails with exit code 1 and names the theme", () => {
    const dir = fixture("#8a8a8a");
    const outcome = tokensCommand({ config: join(dir, "seuil.config.json") });
    expect(outcome.code).toBe(1);
    expect(outcome.output).toContain('theme "admin"');
    expect(outcome.output).toContain("2 pairs checked across 2 themes");
    expect(outcome.output).toContain("1 failing");
  });

  it("writes the results file when asked", () => {
    const dir = fixture("#8a8a8a");
    const json = join(dir, "out.json");
    tokensCommand({ config: join(dir, "seuil.config.json"), json, now: new Date("2026-11-19T00:00:00Z") });
    const results = JSON.parse(readFileSync(json, "utf8"));
    expect(results).toMatchObject({ version: 1, generatedAt: "2026-11-19T00:00:00.000Z" });
    expect(results.findings).toHaveLength(1);
  });

  it("returns exit code 2 when an explicit config file is missing", () => {
    const outcome = tokensCommand({ config: "/nowhere/seuil.config.json" });
    expect(outcome.code).toBe(2);
    expect(outcome.output).toMatch(/not found/i);
  });

  it("returns exit code 2 when no pairs are configured", () => {
    const dir = mkdtempSync(join(tmpdir(), "seuil-cmd-"));
    writeFileSync(join(dir, "seuil.config.json"), JSON.stringify({ tokens: { path: "." } }));
    expect(tokensCommand({ config: join(dir, "seuil.config.json") }).code).toBe(2);
  });
});
