import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { wcag } from "../../wcag.js";
import { locate, openTarget } from "../page.js";
import type { AuditTarget, Rule } from "../types.js";

export function snapshotFile(dir: string, target: AuditTarget): string {
  const name = [target.id, target.theme].filter(Boolean).join("--").replace(/[^a-z0-9._-]+/gi, "_");
  return join(dir, `${name}.aria.yml`);
}

/** Line-level difference, enough to show what changed in a short message. */
function diffLines(before: string, after: string): string[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const removed = a.filter((line) => !b.includes(line)).map((line) => `- ${line.trim()}`);
  const added = b.filter((line) => !a.includes(line)).map((line) => `+ ${line.trim()}`);
  return [...removed, ...added];
}

/**
 * Snapshots the accessibility tree (roles and accessible names) and compares it
 * with the committed reference. A change is not always a bug, so it is a
 * warning: someone confirms it with --update-snapshots, or fixes the regression.
 */
export const namesRule: Rule = {
  id: "a11y/names",
  async run(page, target, context) {
    await openTarget(page, target);
    const snapshot = (await page.locator(target.root ?? "body").ariaSnapshot()) + "\n";
    const file = snapshotFile(context.snapshotsDir, target);

    if (context.updateSnapshots || !existsSync(file)) {
      mkdirSync(context.snapshotsDir, { recursive: true });
      writeFileSync(file, snapshot);
      return [];
    }
    const reference = readFileSync(file, "utf8");
    if (reference === snapshot) return [];

    const changes = diffLines(reference, snapshot);
    const shown = changes.slice(0, 8).join("\n");
    const more = changes.length > 8 ? `\n... and ${changes.length - 8} more` : "";
    return [
      {
        rule: "a11y/names",
        severity: "warning",
        target: locate(target),
        message: `Accessibility tree changed since the reference snapshot (roles or accessible names):\n${shown}${more}`,
        references: [wcag("4.1.2")],
        suggestion: "If the change is intended, run seuil audit --update-snapshots and commit the new snapshot.",
      },
    ];
  },
};
