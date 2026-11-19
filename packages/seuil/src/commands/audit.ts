import { writeFileSync } from "node:fs";
import { ConfigError, loadConfig, type SeuilConfig } from "../config.js";
import { exitCode, type DataFlow, type Finding, type Results } from "../results.js";
import { ALL_RULES, runAudit } from "../audit/run.js";
import { resolveTargets } from "../audit/targets.js";
import type { AuditTarget } from "../audit/types.js";
import { createGeoLookup, GEOIP_ATTRIBUTION } from "../privacy/geo.js";
import { loadProviders } from "../privacy/providers.js";
import { formatFindings, formatRegister, formatSummary } from "../output/text.js";
import type { CommandOutcome } from "./tokens.js";

export interface AuditRunOptions {
  /** Overrides audit.storybookGlobals from the config. */
  globals?: string[];
  /** Subset of rule ids to run. */
  rules?: string[];
  updateSnapshots?: boolean;
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}

export interface AuditOutcome {
  findings: Finding[];
  errors: string[];
  dataFlows: DataFlow[];
  targets: number;
  rules: string[];
  geoip: boolean;
}

/** Resolves every input (URL, Storybook, folder) and audits them all in one browser pool. */
export async function auditTargets(inputs: string[], config: SeuilConfig, options: AuditRunOptions = {}): Promise<AuditOutcome> {
  const unknown = (options.rules ?? []).filter((id) => !ALL_RULES.some((r) => r.id === id));
  if (unknown.length > 0) throw new ConfigError(`Unknown rule(s): ${unknown.join(", ")}. Available: ${ALL_RULES.map((r) => r.id).join(", ")}`);
  const rules = options.rules ? ALL_RULES.filter((r) => options.rules!.includes(r.id)) : ALL_RULES;

  const resolved = await Promise.all(inputs.map((input) => resolveTargets(input, options.globals ?? config.audit.storybookGlobals)));
  const targets: AuditTarget[] = resolved.flatMap((r) => r.targets);
  const geo = createGeoLookup();
  const flows = new Map<string, DataFlow>();
  try {
    const run = await runAudit(
      targets,
      rules,
      {
        snapshotsDir: config.audit.snapshots,
        updateSnapshots: options.updateSnapshots ?? false,
        firstParty: config.firstParty,
        allowThirdParties: config.allowThirdParties,
        providers: loadProviders(),
        geo: geo.lookup,
        recordFlow: (flow) => flows.set(`${flow.target}\u0000${flow.host}`, flow),
      },
      { ...(options.concurrency && { concurrency: options.concurrency }), ...(options.onProgress && { onProgress: options.onProgress }) },
    );
    const dataFlows = [...flows.values()].sort((a, b) => `${a.host}${a.target}`.localeCompare(`${b.host}${b.target}`));
    return { ...run, dataFlows, targets: targets.length, rules: rules.map((r) => r.id), geoip: geo.database !== undefined };
  } finally {
    await Promise.all(resolved.map((r) => r.close()));
  }
}

export function describeAudit(outcome: AuditOutcome): string {
  const errors = outcome.findings.filter((f) => f.severity === "error").length;
  const warnings = outcome.findings.length - errors;
  const register = outcome.dataFlows.length > 0
    ? `Data-flow register (${outcome.dataFlows.length} row(s)):\n${formatRegister(outcome.dataFlows)}${outcome.geoip ? `\n  ${GEOIP_ATTRIBUTION.text} (${GEOIP_ATTRIBUTION.url})` : "\n  Server countries unknown: run pnpm geoip to download DB-IP Lite."}`
    : "";
  return [
    formatFindings(outcome.findings),
    outcome.errors.length > 0 ? `Could not run ${outcome.errors.length} check(s), results are incomplete:\n${outcome.errors.map((e) => `  ${e}`).join("\n")}` : "",
    register,
    `Audited ${outcome.targets} target(s) with ${outcome.rules.length} rule(s): ${errors} error(s), ${warnings} warning(s).\n${formatSummary(outcome.findings, outcome.rules)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface AuditOptions extends AuditRunOptions {
  target: string;
  config: string;
  json?: string;
}

export async function auditCommand(options: AuditOptions): Promise<CommandOutcome> {
  try {
    const config = loadConfig(options.config, { required: options.config !== "seuil.config.json" });
    const outcome = await auditTargets([options.target], config, options);
    const results: Results = {
      version: 1,
      generatedAt: new Date().toISOString(),
      findings: outcome.findings,
      scope: { targets: outcome.targets, rules: outcome.rules },
      ...(outcome.errors.length > 0 && { errors: outcome.errors }),
      ...(outcome.dataFlows.length > 0 && { dataFlows: outcome.dataFlows }),
    };
    if (options.json) writeFileSync(options.json, JSON.stringify(results, null, 2) + "\n");
    return { code: exitCode(results, config.failOn), output: describeAudit(outcome), results };
  } catch (error) {
    return { code: 2, output: `seuil audit: ${(error as Error).message}` };
  }
}
