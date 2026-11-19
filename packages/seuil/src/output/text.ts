import type { Finding } from "../results.js";

const where = (f: Finding) => {
  const t = f.target;
  const scope = [t.theme && `[${t.theme}]`, t.id].filter(Boolean).join(" ");
  return t.selector ? `${scope}  ${t.selector}` : scope;
};

/** Plain terminal output, one block per finding. No colors, so it reads the same in CI logs. */
export function formatFindings(findings: Finding[]): string {
  return findings
    .map((f) => {
      const refs = f.references.map((r) => `${r.standard} ${r.id}`).join(", ");
      const lines = [`${f.severity.toUpperCase()}  ${f.rule}  [${refs}]`, `  at ${where(f)}`];
      lines.push(...f.message.split("\n").map((line) => `  ${line}`));
      if (f.suggestion) lines.push(`  Fix: ${f.suggestion}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

/** One line per rule: "a11y/axe  2 errors, 1 warning". */
export function formatSummary(findings: Finding[], rules: string[]): string {
  return rules
    .map((rule) => {
      const own = findings.filter((f) => f.rule === rule);
      const errors = own.filter((f) => f.severity === "error").length;
      const warnings = own.length - errors;
      const status = own.length === 0 ? "ok" : [errors && `${errors} error${errors > 1 ? "s" : ""}`, warnings && `${warnings} warning${warnings > 1 ? "s" : ""}`].filter(Boolean).join(", ");
      return `  ${rule.padEnd(20)} ${status}`;
    })
    .join("\n");
}
