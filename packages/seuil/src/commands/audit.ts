import { writeFileSync } from "node:fs";
import { ConfigError, loadConfig } from "../config.js";
import { exitCode, type Results } from "../results.js";
import { ALL_RULES, runAudit } from "../audit/run.js";
import { resolveTargets } from "../audit/targets.js";
import { formatFindings, formatSummary } from "../output/text.js";
import type { CommandOutcome } from "./tokens.js";

export interface AuditOptions {
  target: string;
  config: string;
  json?: string;
  /** Overrides audit.storybookGlobals from the config. */
  globals?: string[];
  /** Subset of rule ids to run. */
  rules?: string[];
  updateSnapshots?: boolean;
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}

export async function auditCommand(options: AuditOptions): Promise<CommandOutcome> {
  try {
    const config = loadConfig(options.config, { required: options.config !== "seuil.config.json" });
    const rules = options.rules ? ALL_RULES.filter((r) => options.rules!.includes(r.id)) : ALL_RULES;
    const unknown = (options.rules ?? []).filter((id) => !ALL_RULES.some((r) => r.id === id));
    if (unknown.length > 0) {
      return { code: 2, output: `Unknown rule(s): ${unknown.join(", ")}. Available: ${ALL_RULES.map((r) => r.id).join(", ")}` };
    }

    const resolved = await resolveTargets(options.target, options.globals ?? config.audit.storybookGlobals);
    let run;
    try {
      run = await runAudit(
        resolved.targets,
        rules,
        { snapshotsDir: config.audit.snapshots, updateSnapshots: options.updateSnapshots ?? false },
        { ...(options.concurrency && { concurrency: options.concurrency }), ...(options.onProgress && { onProgress: options.onProgress }) },
      );
    } finally {
      await resolved.close();
    }

    const results: Results = {
      version: 1,
      generatedAt: new Date().toISOString(),
      findings: run.findings,
      scope: { targets: resolved.targets.length, rules: rules.map((r) => r.id) },
      ...(run.errors.length > 0 && { errors: run.errors }),
    };
    if (options.json) writeFileSync(options.json, JSON.stringify(results, null, 2) + "\n");

    const errors = run.findings.filter((f) => f.severity === "error").length;
    const warnings = run.findings.length - errors;
    const parts = [
      formatFindings(run.findings),
      run.errors.length > 0 ? `Could not run ${run.errors.length} check(s), results are incomplete:\n${run.errors.map((e) => `  ${e}`).join("\n")}` : "",
      `Audited ${resolved.targets.length} target(s) with ${rules.length} rule(s): ${errors} error(s), ${warnings} warning(s).\n${formatSummary(run.findings, rules.map((r) => r.id))}`,
    ];
    return { code: exitCode(results, config.failOn), output: parts.filter(Boolean).join("\n\n"), results };
  } catch (error) {
    const message = error instanceof ConfigError ? error.message : (error as Error).message;
    return { code: 2, output: `seuil audit: ${message}` };
  }
}
