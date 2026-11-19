import { writeFileSync } from "node:fs";
import { relative } from "node:path";
import { ConfigError, loadConfig } from "../config.js";
import { exitCode, type Finding, type Results } from "../results.js";
import { checkDependencies } from "../security/deps.js";
import { checkContrast } from "../tokens/check.js";
import { loadTheme } from "../tokens/dtcg.js";
import { formatFindings } from "../output/text.js";
import { auditTargets, describeAudit, type AuditRunOptions } from "./audit.js";
import type { CommandOutcome } from "./tokens.js";

export interface CheckOptions extends AuditRunOptions {
  config: string;
  /** Where to write the results (default seuil-results.json). */
  output: string;
  /** Only for tests: replaces the OSV client. */
  fetchImpl?: typeof fetch;
}

/** Everything the config describes: tokens, every target, dependencies. Writes seuil-results.json. */
export async function checkCommand(options: CheckOptions): Promise<CommandOutcome> {
  try {
    const config = loadConfig(options.config, { required: true });
    const findings: Finding[] = [];
    const errors: string[] = [];
    const rules: string[] = [];
    const sections: string[] = [];

    if (config.tokens && config.tokens.pairs.length > 0) {
      const { path, themes, pairs } = config.tokens;
      const tokenFindings = themes.length === 0 ? checkContrast(loadTheme(path), pairs) : themes.flatMap((t) => checkContrast(loadTheme(path, t), pairs, t));
      findings.push(...tokenFindings);
      rules.push("tokens/contrast");
      sections.push(`tokens/contrast: ${pairs.length * Math.max(themes.length, 1)} pair(s), ${tokenFindings.length} failing.`);
    }

    let audit;
    if (config.targets.length > 0) {
      audit = await auditTargets(config.targets, config, options);
      findings.push(...audit.findings);
      errors.push(...audit.errors);
      rules.push(...audit.rules);
    }

    if (config.offline) {
      sections.push("security/deps: skipped (offline).");
    } else {
      rules.push("security/deps");
      for (const lockfile of config.lockfiles) {
        try {
          const depFindings = await checkDependencies(lockfile, options.fetchImpl);
          findings.push(...depFindings);
          sections.push(`security/deps: ${relative(process.cwd(), lockfile) || lockfile}, ${depFindings.length} advisory(ies).`);
        } catch (error) {
          errors.push(`security/deps on ${lockfile}: ${(error as Error).message}`);
        }
      }
    }

    const results: Results = {
      version: 1,
      generatedAt: new Date().toISOString(),
      findings,
      scope: { targets: audit?.targets ?? 0, rules },
      ...(errors.length > 0 && { errors }),
      ...(audit && audit.dataFlows.length > 0 && { dataFlows: audit.dataFlows }),
    };
    writeFileSync(options.output, JSON.stringify(results, null, 2) + "\n");

    const nonAudit = findings.filter((f) => f.rule === "tokens/contrast" || f.rule === "security/deps");
    const output = [
      formatFindings(nonAudit),
      audit ? describeAudit({ ...audit, errors }) : errors.map((e) => `  ${e}`).join("\n"),
      sections.join("\n"),
      `Results written to ${options.output}.`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return { code: exitCode(results, config.failOn), output, results };
  } catch (error) {
    const message = error instanceof ConfigError ? error.message : (error as Error).message;
    return { code: 2, output: `seuil check: ${message}` };
  }
}
