import type { Page } from "playwright";
import type { Finding } from "../../results.js";
import { wcag } from "../../wcag.js";
import { locate, openTarget } from "../page.js";
import type { Rule } from "../types.js";

/** Upper bound of Tab presses per page (each focused element is also screenshotted twice). */
export const MAX_TAB_STEPS = 1000;

/** Extra Tab presses allowed on one element whose shadow DOM may hold several stops. */
const MAX_SAME_ELEMENT_PRESSES = 20;

import type { Described } from "../page.js";

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return !el || el === document.body || el === document.documentElement ? null : window.__seuil.describe(el);
  });

/**
 * Compares a screenshot of the focused element with one taken after blur.
 * Identical pixels mean the focus indicator is invisible (2.4.7).
 */
async function hasVisibleFocus(page: Page): Promise<boolean> {
  const rect = await page.evaluate(() => {
    const r = document.activeElement!.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, vw: innerWidth, vh: innerHeight };
  });
  const pad = 8;
  const x = Math.max(0, rect.x - pad);
  const y = Math.max(0, rect.y - pad);
  const clip = {
    x,
    y,
    width: Math.max(1, Math.min(rect.vw, rect.x + rect.width + pad) - x),
    height: Math.max(1, Math.min(rect.vh, rect.y + rect.height + pad) - y),
  };
  const withFocus = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
  await page.evaluate(() => {
    window.__seuilLast = document.activeElement as HTMLElement;
    window.__seuilLast.blur();
  });
  const withoutFocus = await page.screenshot({ clip, animations: "disabled", caret: "hide" });
  await page.evaluate(() => window.__seuilLast?.focus());
  return !withFocus.equals(withoutFocus);
}

/**
 * True when the focused element has no size or lies entirely outside the viewport, where the
 * browser cannot scroll it into view (closed off-canvas menus, links moved off-screen).
 */
const isOffScreen = (page: Page) =>
  page.evaluate(() => {
    const r = document.activeElement!.getBoundingClientRect();
    return r.width < 1 || r.height < 1 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight;
  });

/** True when the focused element is entirely covered by something else (2.4.11). */
const isObscured = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const r = el.getBoundingClientRect();
    const points = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + 2, r.top + 2],
      [r.right - 2, r.top + 2],
      [r.left + 2, r.bottom - 2],
      [r.right - 2, r.bottom - 2],
    ];
    return points.every(([px, py]) => {
      const hit = document.elementFromPoint(px!, py!);
      return hit !== null && hit !== el && !el.contains(hit) && !hit.contains(el);
    });
  });

export const keyboardRule: Rule = {
  id: "a11y/keyboard",
  async run(page, target) {
    await openTarget(page, target);
    // Smooth scrolling would leave the focused element mid-scroll when it is measured and screenshotted.
    await page.evaluate(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync("*, html { scroll-behavior: auto !important; }");
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    });
    const findings: Finding[] = [];
    const add = (severity: Finding["severity"], criterion: string, element: Described, message: string, suggestion?: string) =>
      findings.push({
        rule: "a11y/keyboard",
        severity,
        target: locate(target, element),
        message,
        references: [wcag(criterion)],
        ...(suggestion && { suggestion }),
      });

    // Radio buttons sharing a name are one tab stop: Tab enters the group, arrows move inside it.
    const tabbables = await page.evaluate(() =>
      window.__seuil.tabbables().map((el) => ({
        ...window.__seuil.describe(el),
        radioGroup: el instanceof HTMLInputElement && el.type === "radio" && el.name ? `${el.form?.id ?? ""}:${el.name}` : null,
      })),
    );

    for (const el of await page.evaluate(() =>
      [...document.querySelectorAll("[tabindex]")].filter((e) => (e as HTMLElement).tabIndex > 0).map((e) => window.__seuil.describe(e)),
    )) {
      add("warning", "2.4.3", el, "Positive tabindex: this element jumps ahead of the visual reading order.", 'Use tabindex="0" and order the DOM instead.');
    }

    for (const el of await page.evaluate(() =>
      window.__seuil.interactive().filter((e) => (e as HTMLElement).tabIndex < 0).map((e) => window.__seuil.describe(e)),
    )) {
      add("error", "2.1.1", el, "Interactive element that keyboard users cannot reach.", "Use a native <button> or <a href>, or add tabindex=\"0\" and key handlers.");
    }

    // Walk the page with real Tab presses.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const sequence: Described[] = [];
    const maxSteps = Math.min(MAX_TAB_STEPS, tabbables.length * 2 + 4 + MAX_SAME_ELEMENT_PRESSES);
    let exhausted = true;
    let cycleStart = -1;
    let emptySteps = 0;
    // Tab pressed and focus stayed on the same element (without passing through the document): a trap.
    let stuck = false;
    let passedDocument = false;
    let samePresses = 0;
    for (let step = 0; step < maxSteps; step++) {
      await page.keyboard.press("Tab");
      const current = await focused(page);
      if (!current) {
        passedDocument = true;
        if (++emptySteps > 2) {
          exhausted = false;
          break;
        }
        continue;
      }
      emptySteps = 0;
      // Same element again without passing through the document. Focus may be moving inside its
      // shadow DOM (video controls, web components): keep pressing Tab before calling it a trap.
      if (current.selector === sequence.at(-1)?.selector && !passedDocument) {
        if (++samePresses <= MAX_SAME_ELEMENT_PRESSES) continue;
        stuck = sequence.length < tabbables.length;
        exhausted = false;
        break;
      }
      samePresses = 0;
      const seen = sequence.findIndex((s) => s.selector === current.selector);
      if (seen !== -1) {
        cycleStart = seen;
        exhausted = false;
        break;
      }
      passedDocument = false;
      sequence.push(current);
      // A hidden element also shows no focus indicator: report the cause once.
      if (await isOffScreen(page)) {
        add("error", "2.4.7", current, "Keyboard focus lands on an element that is off-screen or has no size.", "Hide closed menus and panels with display:none, visibility:hidden or inert, or move the element into view when it receives focus.");
      } else if (await isObscured(page)) {
        add("error", "2.4.11", current, "The focused element is entirely hidden by other content.", "Add scroll-padding for sticky headers and banners, or make sure overlays do not cover focused elements.");
      } else if (!(await hasVisibleFocus(page))) {
        add("error", "2.4.7", current, "Keyboard focus is not visible on this element.", "Keep the browser outline or add a :focus-visible style with at least 3:1 contrast.");
      }
    }

    const trapped = cycleStart > 0 || stuck;
    if (trapped) {
      const trapAt = stuck ? sequence.length - 1 : cycleStart;
      add(
        "error",
        "2.1.2",
        sequence[trapAt]!,
        stuck
          ? `Keyboard trap: Tab does not move focus away from this element; ${tabbables.length - sequence.length} other focusable element(s) stay out of reach.`
          : `Keyboard trap: Tab keeps cycling from here and never returns to the ${cycleStart} element(s) before it.`,
        "Let Tab and Shift+Tab move focus out, or provide a documented way to leave (Escape for dialogs).",
      );
    } else if (exhausted && sequence.length >= MAX_TAB_STEPS / 2) {
      // The walk hit its step limit before coming back to the start: unvisited elements were not tested, not proven unreachable.
      add(
        "warning",
        "2.1.1",
        sequence.at(-1)!,
        `Keyboard walk stopped after ${sequence.length} elements; ${tabbables.length - sequence.length} focusable element(s) after this point were not checked.`,
        "Audit smaller pages, or check the end of this page by hand.",
      );
    } else {
      const visited = new Set(sequence.map((s) => s.selector));
      const visitedGroups = new Set(tabbables.filter((t) => t.radioGroup && visited.has(t.selector)).map((t) => t.radioGroup));
      for (const t of tabbables.filter((t) => !visited.has(t.selector) && !(t.radioGroup && visitedGroups.has(t.radioGroup)))) {
        add("error", "2.1.1", { selector: t.selector, snippet: t.snippet }, "Focusable element that Tab never reaches.", "Check for focus being stolen or for elements hidden from the tab order by scripts.");
      }
    }
    return findings;
  },
};

