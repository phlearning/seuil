import { chromium } from "playwright";
import type { Finding } from "../results.js";
import { axeRule } from "./rules/axe.js";
import { keyboardRule } from "./rules/keyboard.js";
import { motionRule, reflowRule, targetSizeRule, textSpacingRule } from "./rules/layout.js";
import { namesRule } from "./rules/names.js";
import type { AuditTarget, Rule, RuleContext } from "./types.js";

export const ALL_RULES: Rule[] = [axeRule, keyboardRule, reflowRule, textSpacingRule, motionRule, targetSizeRule, namesRule];

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

  const worker = async () => {
    const browserContext = await browser.newContext();
    try {
      while (next < jobs.length) {
        const { target, rule } = jobs[next++]!;
        const page = await browserContext.newPage();
        try {
          findings.push(...(await rule.run(page, target, context)));
        } catch (error) {
          const where = [target.id, target.theme].filter(Boolean).join(" / ");
          errors.push(`${rule.id} on ${where}: ${(error as Error).message.split("\n")[0]}`);
        } finally {
          await page.close();
          onProgress?.(++done, jobs.length);
        }
      }
    } finally {
      await browserContext.close();
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
