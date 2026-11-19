import type { Reference } from "./results.js";

/** Slugs of the "Understanding WCAG 2.2" pages for the criteria Seuil cites. */
const SLUGS: Record<string, string> = {
  "1.1.1": "non-text-content",
  "1.3.1": "info-and-relationships",
  "1.4.1": "use-of-color",
  "1.4.3": "contrast-minimum",
  "1.4.4": "resize-text",
  "1.4.10": "reflow",
  "1.4.11": "non-text-contrast",
  "1.4.12": "text-spacing",
  "2.1.1": "keyboard",
  "2.1.2": "no-keyboard-trap",
  "2.2.2": "pause-stop-hide",
  "2.3.3": "animation-from-interactions",
  "2.4.1": "bypass-blocks",
  "2.4.3": "focus-order",
  "2.4.7": "focus-visible",
  "2.4.11": "focus-not-obscured-minimum",
  "2.5.8": "target-size-minimum",
  "3.1.1": "language-of-page",
  "3.3.1": "error-identification",
  "3.3.2": "labels-or-instructions",
  "4.1.2": "name-role-value",
};

export function wcag(id: string): Reference {
  const slug = SLUGS[id];
  return slug
    ? { standard: "WCAG 2.2", id, url: `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html` }
    : { standard: "WCAG 2.2", id };
}

/** axe-core tags such as "wcag143" or "wcag1410" to "1.4.3" / "1.4.10". */
export function criterionFromAxeTag(tag: string): string | undefined {
  const match = /^wcag(\d)(\d)(\d+)$/.exec(tag);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : undefined;
}
