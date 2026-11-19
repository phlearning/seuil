import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { flatten, loadTheme, mergeTrees, resolveToken } from "./dtcg.js";

describe("flatten", () => {
  it("turns nested groups into dotted paths", () => {
    const tokens = flatten({ color: { text: { default: { $type: "color", $value: "#000" } } } });
    expect(tokens.get("color.text.default")).toEqual({ $type: "color", $value: "#000" });
  });

  it("inherits $type from the nearest group", () => {
    const tokens = flatten({ color: { $type: "color", bg: { $value: "#fff" } } });
    expect(tokens.get("color.bg")?.$type).toBe("color");
  });

  it("ignores $-prefixed metadata such as $description", () => {
    const tokens = flatten({ $description: "x", color: { bg: { $type: "color", $value: "#fff" } } });
    expect([...tokens.keys()]).toEqual(["color.bg"]);
  });
});

describe("mergeTrees", () => {
  it("lets the theme override the base", () => {
    const merged = mergeTrees(
      { color: { bg: { $type: "color", $value: "#fff" } }, space: { 1: { $type: "dimension", $value: "4px" } } },
      { color: { bg: { $type: "color", $value: "#000" } } },
    );
    expect(flatten(merged).get("color.bg")?.$value).toBe("#000");
    expect(flatten(merged).get("space.1")?.$value).toBe("4px");
  });
});

describe("resolveToken", () => {
  const tokens = flatten({
    palette: { teal: { $type: "color", $value: "#0b6e6e" } },
    color: {
      action: { $type: "color", $value: "{palette.teal}" },
      button: { $type: "color", $value: "{color.action}" },
      loopA: { $type: "color", $value: "{color.loopB}" },
      loopB: { $type: "color", $value: "{color.loopA}" },
      broken: { $type: "color", $value: "{palette.missing}" },
    },
  });

  it("follows aliases, including chains", () => {
    expect(resolveToken(tokens, "color.button")).toMatchObject({ $value: "#0b6e6e", chain: ["color.button", "color.action", "palette.teal"] });
  });

  it("detects cycles", () => {
    expect(() => resolveToken(tokens, "color.loopA")).toThrow(/cycle/i);
  });

  it("names the missing token", () => {
    expect(() => resolveToken(tokens, "color.broken")).toThrow(/palette\.missing/);
  });

  it("reports an unknown token", () => {
    expect(() => resolveToken(tokens, "color.nope")).toThrow(/not found/i);
  });
});

describe("loadTheme", () => {
  it("merges every base file with the theme file", () => {
    const dir = mkdtempSync(join(tmpdir(), "seuil-tokens-"));
    mkdirSync(join(dir, "themes"));
    writeFileSync(join(dir, "base.tokens.json"), JSON.stringify({ color: { bg: { $type: "color", $value: "#fff" } } }));
    writeFileSync(join(dir, "palette.tokens.json"), JSON.stringify({ palette: { ink: { $type: "color", $value: "#111" } } }));
    writeFileSync(join(dir, "themes", "dark.tokens.json"), JSON.stringify({ color: { bg: { $type: "color", $value: "{palette.ink}" } } }));

    const tokens = loadTheme(dir, "dark");
    expect(resolveToken(tokens, "color.bg").$value).toBe("#111");
  });

  it("works without themes", () => {
    const dir = mkdtempSync(join(tmpdir(), "seuil-tokens-"));
    writeFileSync(join(dir, "base.tokens.json"), JSON.stringify({ color: { bg: { $type: "color", $value: "#fff" } } }));
    expect(resolveToken(loadTheme(dir), "color.bg").$value).toBe("#fff");
  });

  it("fails clearly when the theme file is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "seuil-tokens-"));
    expect(() => loadTheme(dir, "ghost")).toThrow(/ghost/);
  });
});
