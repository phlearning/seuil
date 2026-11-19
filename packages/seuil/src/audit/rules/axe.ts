import { AxeBuilder } from "@axe-core/playwright";
import type { Finding, Reference } from "../../results.js";
import { criterionFromAxeTag, wcag } from "../../wcag.js";
import { locate, openTarget } from "../page.js";
import type { Rule } from "../types.js";

/** Only rules mapped to WCAG A and AA success criteria; axe "best practices" are left out. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export const axeRule: Rule = {
  id: "a11y/axe",
  async run(page, target) {
    await openTarget(page, target);
    // target-size is covered by a11y/target-size, which also applies the spacing and inline exceptions.
    const results = await new AxeBuilder({ page }).withTags(TAGS).disableRules(["target-size"]).analyze();

    return results.violations.flatMap((violation) => {
      const criteria = violation.tags.map(criterionFromAxeTag).filter((c): c is string => c !== undefined);
      const references: Reference[] = [
        ...criteria.map(wcag),
        { standard: "axe-core", id: violation.id, url: violation.helpUrl },
      ];
      return violation.nodes.map(
        (node): Finding => ({
          rule: "a11y/axe",
          severity: "error",
          target: locate(target, {
            selector: node.target.map(String).join(" "),
            snippet: node.html.length > 240 ? node.html.slice(0, 240) + "..." : node.html,
          }),
          message: violation.help + ".",
          references,
          ...(node.failureSummary && { suggestion: node.failureSummary.replace(/\s+/g, " ").trim() }),
        }),
      );
    });
  },
};
