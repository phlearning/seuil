import { describe, expect, it } from "vitest";
import { checkContrast, normalizePair } from "./check.js";
import { flatten } from "./dtcg.js";

const tokens = flatten({
  color: {
    $type: "color",
    bg: { $value: "#ffffff" },
    ok: { $value: "#767676" },
    weak: { $value: "#777777" },
    faint: { $value: "#aaaaaa" },
    alias: { $value: "{color.weak}" },
    notAColor: { $type: "dimension", $value: "4px" },
  },
});

describe("normalizePair", () => {
  it("defaults a tuple to normal text", () => {
    expect(normalizePair(["a", "b"])).toEqual({ fg: "a", bg: "b", kind: "text" });
  });

  it("keeps an explicit kind", () => {
    expect(normalizePair({ fg: "a", bg: "b", kind: "ui" })).toEqual({ fg: "a", bg: "b", kind: "ui" });
  });
});

describe("checkContrast", () => {
  it("returns nothing for a passing pair", () => {
    expect(checkContrast(tokens, [["color.ok", "color.bg"]])).toEqual([]);
  });

  it("flags normal text below 4.5:1 against 1.4.3", () => {
    const [finding] = checkContrast(tokens, [["color.weak", "color.bg"]], "admin");
    expect(finding).toMatchObject({
      rule: "tokens/contrast",
      severity: "error",
      target: { kind: "token", id: "color.weak", theme: "admin" },
      references: [{ standard: "WCAG 2.2", id: "1.4.3" }],
    });
    expect(finding?.message).toContain("4.47:1");
    expect(finding?.message).toContain("4.5:1");
  });

  it("applies 3:1 to large text and UI components", () => {
    expect(checkContrast(tokens, [{ fg: "color.weak", bg: "color.bg", kind: "large-text" }])).toEqual([]);
    const [ui] = checkContrast(tokens, [{ fg: "color.faint", bg: "color.bg", kind: "ui" }]);
    expect(ui?.references[0]?.id).toBe("1.4.11");
  });

  it("shows the alias chain in the message", () => {
    const [finding] = checkContrast(tokens, [["color.alias", "color.bg"]]);
    expect(finding?.message).toContain("color.alias -> color.weak");
  });

  it("suggests a passing color", () => {
    const [finding] = checkContrast(tokens, [["color.weak", "color.bg"]]);
    expect(finding?.suggestion).toMatch(/#[0-9a-f]{6}/);
  });

  it("reports a missing token as an error instead of crashing", () => {
    const [finding] = checkContrast(tokens, [["color.ghost", "color.bg"]]);
    expect(finding).toMatchObject({ rule: "tokens/contrast", severity: "error" });
    expect(finding?.message).toMatch(/not found/i);
  });

  it("reports a token that is not a color", () => {
    const [finding] = checkContrast(tokens, [["color.notAColor", "color.bg"]]);
    expect(finding?.message).toMatch(/not a color/i);
  });
});
