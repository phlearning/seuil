import type { Finding } from "../results.js";

/** Plain terminal output, one block per finding. No colors, so it reads the same in CI logs. */
export function formatFindings(findings: Finding[]): string {
  return findings
    .map((f) => {
      const refs = f.references.map((r) => `${r.standard} ${r.id}`).join(", ");
      const lines = [`${f.severity.toUpperCase()}  ${f.rule}  [${refs}]`, `  ${f.message}`];
      if (f.suggestion) lines.push(`  Fix: ${f.suggestion}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
