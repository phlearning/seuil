import { describe, expect, it } from "vitest";
import { contrastRatio, formatRatio, parseColor, relativeLuminance } from "./contrast.js";

describe("parseColor", () => {
  it("reads 6-digit hex", () => {
    expect(parseColor("#0b6e6e")).toEqual({ r: 11, g: 110, b: 110, a: 1 });
  });

  it("reads 3-digit hex", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it("reads 8-digit hex with alpha", () => {
    expect(parseColor("#00000080")).toEqual({ r: 0, g: 0, b: 0, a: 128 / 255 });
  });

  it("reads the DTCG object form in srgb", () => {
    expect(parseColor({ colorSpace: "srgb", components: [1, 0.5, 0], alpha: 1 })).toEqual({
      r: 255,
      g: 127.5,
      b: 0,
      a: 1,
    });
  });

  it("falls back to the hex field of a DTCG object in another color space", () => {
    expect(parseColor({ colorSpace: "oklch", components: [0.5, 0.1, 200], hex: "#336699" })).toEqual({
      r: 51,
      g: 102,
      b: 153,
      a: 1,
    });
  });

  it("rejects what it cannot read", () => {
    expect(() => parseColor("rebeccapurple")).toThrow(/unsupported color/i);
    expect(() => parseColor("#12345")).toThrow(/unsupported color/i);
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 1 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 })).toBe(1);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  it("is 1 for identical colors", () => {
    expect(contrastRatio("#3366cc", "#3366cc")).toBe(1);
  });

  // Reference values: #767676 is the lightest grey that passes 4.5:1 on white, #777777 fails.
  it("puts #767676 on white just above 4.5", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("puts #777777 on white just below 4.5", () => {
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5);
  });

  it("composites a translucent foreground over the background", () => {
    // 50% black over white is a mid grey (#808080 area), around 3.9:1.
    const ratio = contrastRatio("#00000080", "#ffffff");
    expect(ratio).toBeGreaterThan(3.8);
    expect(ratio).toBeLessThan(4.1);
  });

  it("refuses a translucent background, which has no single answer", () => {
    expect(() => contrastRatio("#000000", "#ffffff80")).toThrow(/background/i);
  });
});

describe("formatRatio", () => {
  it("never rounds a failing ratio up to a passing one", () => {
    expect(formatRatio(4.4999)).toBe("4.49:1");
  });

  it("keeps two decimals", () => {
    expect(formatRatio(21)).toBe("21.00:1");
  });
});
