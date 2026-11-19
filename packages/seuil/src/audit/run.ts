import { chromium } from "playwright";
import type { Finding } from "../results.js";
import { axeRule } from "./rules/axe.js";
import { keyboardRule } from "./rules/keyboard.js";
import { labelsRule } from "./rules/labels.js";
import { motionRule, reflowRule, targetSizeRule, textSpacingRule } from "./rules/layout.js";
import { headersRule } from "./rules/headers.js";
import { inventoryRule } from "./rules/inventory.js";
import { namesRule } from "./rules/names.js";
import { consentRule, thirdPartiesRule } from "./rules/privacy.js";
import type { AuditTarget, Rule, RuleContext } from "./types.js";

export const ALL_RULES: Rule[] = [
  axeRule,
  keyboardRule,
  labelsRule,
  reflowRule,
  textSpacingRule,
  motionRule,
  targetSizeRule,
  namesRule,
  thirdPartiesRule,
  consentRule,
  headersRule,
  inventoryRule,
];

export interface AuditRun {
  findings: Finding[];
  /** Rule runs that crashed (page did not load, script error...): the audit is incomplete. */
  errors: string[];
}

export async function runAudit(
  targets: AuditTarget[],
  rules: Rule[],
  context: RuleContext,
  { concurrency = 4, onProgress }: { concurrency?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<AuditRun> {
  const jobs = targets.flatMap((target) => rules.map((rule) => ({ target, rule })));
  const findings: Finding[] = [];
  const errors: string[] = [];
  const browser = await chromium.launch();
  let next = 0;
  let done = 0;

  // A fresh browser context per check: no cache (a 304 would hide the real headers)
  // and no cookies carried from one page into another page's consent check.
  const worker = async () => {
    while (next < jobs.length) {
      const { target, rule } = jobs[next++]!;
      const browserContext = await browser.newContext();
      try {
        const page = await browserContext.newPage();
        findings.push(...(await rule.run(page, target, context)));
      } catch (error) {
        const where = [target.id, target.theme].filter(Boolean).join(" / ");
        errors.push(`${rule.id} on ${where}: ${(error as Error).message.split("\n")[0]}`);
      } finally {
        await browserContext.close();
        onProgress?.(++done, jobs.length);
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, worker));
  } finally {
    await browser.close();
  }

  // Stable order: by target, then theme, then rule, so diffs between runs stay readable.
  const key = (f: Finding) => `${f.target.id}\u0000${f.target.theme ?? ""}\u0000${f.rule}\u0000${f.target.selector ?? ""}`;
  findings.sort((a, b) => key(a).localeCompare(key(b)));
  return { findings, errors };
}
