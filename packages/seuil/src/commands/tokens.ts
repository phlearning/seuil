import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConfigError, loadConfig } from "../config.js";
import { exitCode, type Results } from "../results.js";
import { checkContrast } from "../tokens/check.js";
import { loadTheme } from "../tokens/dtcg.js";
import { formatFindings } from "../output/text.js";

export interface TokensOptions {
  dir?: string;
  config: string;
  json?: string;
  /** Override the clock in tests. */
  now?: Date;
}

export interface CommandOutcome {
  code: 0 | 1 | 2;
  output: string;
  results?: Results;
}

export function tokensCommand(options: TokensOptions): CommandOutcome {
  try {
    const config = loadConfig(options.config, { required: options.config !== "seuil.config.json" });
    const dir = options.dir === undefined ? config.tokens?.path : resolve(options.dir);
    if (dir === undefined) {
      return { code: 2, output: "No tokens directory: pass one, or set tokens.path in seuil.config.json." };
    }
    const pairs = config.tokens?.pairs ?? [];
    if (pairs.length === 0) {
      return { code: 2, output: "No color pairs to check: set tokens.pairs in seuil.config.json." };
    }
    const themes = config.tokens?.themes ?? [];

    const findings = themes.length === 0
      ? checkContrast(loadTheme(dir), pairs)
      : themes.flatMap((theme) => checkContrast(loadTheme(dir, theme), pairs, theme));

    const results: Results = { version: 1, generatedAt: (options.now ?? new Date()).toISOString(), findings };
    if (options.json) writeFileSync(options.json, JSON.stringify(results, null, 2) + "\n");

    const checked = pairs.length * Math.max(themes.length, 1);
    const scope = themes.length === 0 ? "" : ` across ${themes.length} themes (${themes.join(", ")})`;
    const summary = `tokens/contrast: ${checked} pairs checked${scope}, ${findings.length} failing.`;
    return { code: exitCode(results, config.failOn), output: [formatFindings(findings), summary].filter(Boolean).join("\n\n"), results };
  } catch (error) {
    const message = error instanceof ConfigError || error instanceof SyntaxError ? error.message : String((error as Error).message ?? error);
    return { code: 2, output: `seuil tokens: ${message}` };
  }
}
