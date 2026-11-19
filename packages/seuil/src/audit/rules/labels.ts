import type { Finding } from "../../results.js";
import { wcag } from "../../wcag.js";
import { locate, openTarget } from "../page.js";
import type { Rule } from "../types.js";

/**
 * Form fields whose only name is their placeholder. axe-core accepts a placeholder
 * as an accessible name, but it disappears as soon as the user types and is often
 * low contrast: WCAG 3.3.2 asks for a label or instructions that stay visible.
 */
export const labelsRule: Rule = {
  id: "a11y/labels",
  async run(page, target) {
    await openTarget(page, target);
    const fields = await page.evaluate(() =>
      [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]), textarea, select")]
        .filter((el) => window.__seuil.isVisible(el))
        .filter((el) => {
          const id = el.getAttribute("id");
          const hasLabel = (el as HTMLInputElement).labels?.length || (id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
          const named = el.getAttribute("aria-label")?.trim() || el.getAttribute("aria-labelledby")?.trim() || el.getAttribute("title")?.trim();
          return !hasLabel && !named;
        })
        .map((el) => ({ ...window.__seuil.describe(el), placeholder: el.getAttribute("placeholder") ?? "" })),
    );
    return fields.map(
      ({ placeholder, ...el }): Finding => ({
        rule: "a11y/labels",
        severity: "error",
        target: locate(target, el),
        message: placeholder
          ? `Field labelled only by its placeholder ("${placeholder}"), which disappears as soon as the user types.`
          : "Field without any label.",
        references: [wcag("3.3.2"), wcag("1.3.1")],
        suggestion: "Add a visible <label for> (the TextField component does it).",
      }),
    );
  },
};
