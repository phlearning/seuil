/**
 * WCAG 2.2 contrast ratio (success criteria 1.4.3, 1.4.6 and 1.4.11).
 * https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */

/** sRGB channels in 0-255 (may be fractional), alpha in 0-1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** A DTCG color value: a hex string, or the object form of the 2025 format. */
export type ColorValue =
  | string
  | { colorSpace: string; components: (number | "none")[]; alpha?: number; hex?: string };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function parseHex(hex: string): Rgba {
  const match = HEX.exec(hex.trim());
  if (!match?.[1]) throw new Error(`Unsupported color: ${hex}`);
  let digits = match[1];
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join("");
  const channel = (i: number) => parseInt(digits.slice(i, i + 2), 16);
  return {
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: digits.length === 8 ? channel(6) / 255 : 1,
  };
}

export function parseColor(value: ColorValue): Rgba {
  if (typeof value === "string") return parseHex(value);
  if (value.colorSpace === "srgb" && value.components.every((c) => typeof c === "number")) {
    const [r = 0, g = 0, b = 0] = value.components as number[];
    return { r: r * 255, g: g * 255, b: b * 255, a: value.alpha ?? 1 };
  }
  if (value.hex) {
    return { ...parseHex(value.hex), a: value.alpha ?? 1 };
  }
  throw new Error(`Unsupported color: ${JSON.stringify(value)}`);
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Alpha-composite a foreground over an opaque background. */
function composite(fg: Rgba, bg: Rgba): Rgba {
  const mix = (f: number, b: number) => f * fg.a + b * (1 - fg.a);
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 };
}

export function contrastRatio(foreground: ColorValue, background: ColorValue): number {
  const bg = parseColor(background);
  if (bg.a < 1) {
    throw new Error("Translucent background: contrast depends on what lies beneath it");
  }
  const fg = composite(parseColor(foreground), bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Truncates rather than rounds, so 4.499 never shows as a passing 4.50. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}
