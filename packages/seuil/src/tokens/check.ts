import type { Finding } from "../results.js";
import { contrastRatio, formatRatio, parseColor, type ColorValue, type Rgba } from "./contrast.js";
import { resolveToken, type Token } from "./dtcg.js";

export type PairKind = "text" | "large-text" | "ui";

export interface Pair {
  fg: string;
  bg: string;
  kind: PairKind;
}

/** In the config, a pair is either ["fg", "bg"] (normal text) or an object with a kind. */
export type PairInput = [string, string] | { fg: string; bg: string; kind?: PairKind };

const REQUIREMENTS: Record<PairKind, { min: number; criterion: string; label: string }> = {
  text: { min: 4.5, criterion: "1.4.3", label: "normal text" },
  "large-text": { min: 3, criterion: "1.4.3", label: "large text" },
  ui: { min: 3, criterion: "1.4.11", label: "UI component" },
};

const WCAG_URL: Record<string, string> = {
  "1.4.3": "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html",
  "1.4.11": "https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html",
};

export function normalizePair(input: PairInput): Pair {
  return Array.isArray(input) ? { fg: input[0], bg: input[1], kind: "text" } : { kind: "text", ...input };
}

const toHex = ({ r, g, b }: Rgba) =>
  "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

/** Darkens (or lightens, on a dark background) the foreground until it passes. */
function suggestColor(fg: ColorValue, bg: ColorValue, min: number): { hex: string; direction: string } | undefined {
  const from = parseColor(fg);
  const back = toHex(parseColor(bg));
  const darken = contrastRatio("#000000", bg) >= contrastRatio("#ffffff", bg);
  const towards = darken ? 0 : 255;
  for (let step = 1; step <= 100; step++) {
    const mix = (c: number) => c + (towards - c) * (step / 100);
    const hex = toHex({ r: mix(from.r), g: mix(from.g), b: mix(from.b), a: 1 });
    if (contrastRatio(hex, back) >= min) return { hex, direction: darken ? "darker" : "lighter" };
  }
  return undefined;
}

function colorOf(tokens: Map<string, Token>, path: string): { value: ColorValue; chain: string[] } {
  const token = resolveToken(tokens, path);
  if (token.$type !== "color") throw new Error(`${path} is not a color token (type: ${token.$type ?? "none"})`);
  return { value: token.$value as ColorValue, chain: token.chain };
}

export function checkContrast(tokens: Map<string, Token>, pairs: PairInput[], theme?: string): Finding[] {
  const findings: Finding[] = [];
  const target = (id: string) => (theme === undefined ? { kind: "token" as const, id } : { kind: "token" as const, id, theme });

  for (const input of pairs) {
    const pair = normalizePair(input);
    const req = REQUIREMENTS[pair.kind];
    const reference = { standard: "WCAG 2.2", id: req.criterion, url: WCAG_URL[req.criterion] ?? "" };
    try {
      const fg = colorOf(tokens, pair.fg);
      const bg = colorOf(tokens, pair.bg);
      const ratio = contrastRatio(fg.value, bg.value);
      if (ratio >= req.min) continue;

      const where = theme === undefined ? "" : ` in theme "${theme}"`;
      const suggestion = suggestColor(fg.value, bg.value, req.min);
      findings.push({
        rule: "tokens/contrast",
        severity: "error",
        target: target(pair.fg),
        message:
          `${fg.chain.join(" -> ")} on ${bg.chain.join(" -> ")}${where}: ` +
          `contrast ${formatRatio(ratio)}, below the ${req.min}:1 required for ${req.label}.`,
        references: [reference],
        ...(suggestion && {
          suggestion: `Use ${suggestion.hex} or ${suggestion.direction} for ${fg.chain.at(-1)} (same hue, reaches ${req.min}:1).`,
        }),
      });
    } catch (error) {
      findings.push({
        rule: "tokens/contrast",
        severity: "error",
        target: target(pair.fg),
        message: `Cannot check ${pair.fg} on ${pair.bg}: ${(error as Error).message}`,
        references: [reference],
      });
    }
  }
  return findings;
}
