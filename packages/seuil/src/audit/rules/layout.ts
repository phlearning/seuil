/** Rules that change the viewport, text spacing or motion preference, then look for lost content. */
import type { Finding } from "../../results.js";
import { wcag } from "../../wcag.js";
import { locate, openTarget, type Described } from "../page.js";
import type { Rule } from "../types.js";

/** Content that legitimately needs two dimensions (WCAG 1.4.10 exception). */
const TWO_DIMENSIONAL = "table, pre, code, canvas, svg, video, iframe, [role='grid'], [role='img']";

export const reflowRule: Rule = {
  id: "a11y/reflow",
  async run(page, target) {
    const findings: Finding[] = [];

    // 1.4.10: 320 CSS px wide (1280 px at 400% zoom) must not scroll horizontally.
    await openTarget(page, target, { viewport: { width: 320, height: 256 } });
    const overflow = await page.evaluate((twoD) => {
      const doc = document.documentElement;
      if (doc.scrollWidth <= innerWidth + 1) return null;
      const wide = [...document.body.querySelectorAll("*")].filter(
        (el) => window.__seuil.isVisible(el) && el.getBoundingClientRect().right > innerWidth + 1,
      );
      const leaves = wide.filter((el) => !wide.some((other) => other !== el && el.contains(other)));
      return {
        width: doc.scrollWidth,
        offenders: leaves.slice(0, 5).map((el) => ({ ...window.__seuil.describe(el), twoD: el.closest(twoD) !== null })),
      };
    }, TWO_DIMENSIONAL);

    if (overflow) {
      for (const { twoD, ...el } of overflow.offenders) {
        findings.push({
          rule: "a11y/reflow",
          severity: twoD ? "warning" : "error",
          target: locate(target, el),
          message: twoD
            ? `Page scrolls horizontally at 320 px (${overflow.width} px wide) because of two-dimensional content. Allowed only if this content truly needs it.`
            : `Page scrolls horizontally at 320 px (${overflow.width} px wide): this element does not reflow.`,
          references: [wcag("1.4.10")],
          suggestion: "Avoid fixed widths; use max-width: 100%, flex-wrap and min-width: 0 on flex children.",
        });
      }
    }
    const clippedAt320 = await page.evaluate(() => window.__seuil.clipped());

    // 1.4.4: text resized to 200% (a 1280 px window shows 640 CSS px).
    await openTarget(page, target, { viewport: { width: 640, height: 400 } });
    const clippedAt640 = await page.evaluate(() => window.__seuil.clipped());

    const seen = new Set<string>();
    const report = (list: Described[], criterion: string, message: string) => {
      for (const el of list) {
        if (seen.has(el.selector)) continue;
        seen.add(el.selector);
        findings.push({
          rule: "a11y/reflow",
          severity: "error",
          target: locate(target, el),
          message,
          references: [wcag(criterion)],
          suggestion: "Let the box grow with its text: avoid fixed heights and overflow: hidden on text containers.",
        });
      }
    };
    report(clippedAt640, "1.4.4", "Text is cut off when resized to 200%.");
    report(clippedAt320, "1.4.10", "Text is cut off at 320 px wide.");
    return findings;
  },
};

/** The spacing values of WCAG 1.4.12, as in the reference bookmarklet. */
const SPACING_CSS = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }`;

export const textSpacingRule: Rule = {
  id: "a11y/text-spacing",
  async run(page, target) {
    await openTarget(page, target);
    const before = new Set((await page.evaluate(() => window.__seuil.clipped())).map((d) => d.selector));
    await page.addStyleTag({ content: SPACING_CSS });
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const after = await page.evaluate(() => window.__seuil.clipped());
    return after
      .filter((el) => !before.has(el.selector))
      .map((el) => ({
        rule: "a11y/text-spacing",
        severity: "error" as const,
        target: locate(target, el),
        message: "Text is cut off when users increase line, letter and word spacing.",
        references: [wcag("1.4.12")],
        suggestion: "Do not fix the height of text containers; let them grow.",
      }));
  },
};

export const motionRule: Rule = {
  id: "a11y/motion",
  async run(page, target) {
    await openTarget(page, target, { reducedMotion: "reduce" });
    await page.waitForTimeout(300);
    const running = await page.evaluate(() => {
      const out = new Map<string, { selector: string; snippet: string; endless: boolean }>();
      for (const animation of document.getAnimations()) {
        if (animation.playState !== "running") continue;
        const effect = animation.effect as KeyframeEffect | null;
        const timing = effect?.getComputedTiming();
        const element = effect?.target;
        if (!timing || !(element instanceof Element)) continue;
        const endless = timing.iterations === Infinity;
        if (!endless && Number(timing.endTime) <= 5000) continue;
        const described = window.__seuil.describe(element);
        out.set(described.selector, { ...described, endless });
      }
      return [...out.values()];
    });
    return running.map(({ endless, ...el }) => ({
      rule: "a11y/motion",
      severity: "warning" as const,
      target: locate(target, el),
      message: `${endless ? "Endless" : "Long"} animation keeps running although the user asked for reduced motion. Needs a pause control (2.2.2), and should stop under prefers-reduced-motion (2.3.3, AAA).`,
      references: [wcag("2.2.2"), wcag("2.3.3")],
      suggestion: "Wrap the animation in @media (prefers-reduced-motion: no-preference), or offer a pause button.",
    }));
  },
};

export const targetSizeRule: Rule = {
  id: "a11y/target-size",
  async run(page, target) {
    await openTarget(page, target);
    const small = await page.evaluate(() => {
      const targets = window.__seuil.interactive().map((el) => ({ el, r: el.getBoundingClientRect() }));
      const isInlineLink = (el: Element) => {
        if (el.tagName !== "A" || getComputedStyle(el).display !== "inline") return false;
        const parentText = el.parentElement?.textContent?.trim() ?? "";
        return parentText.length > (el.textContent?.trim().length ?? 0) + 10;
      };
      const undersized = targets.filter(({ el, r }) => (r.width < 24 || r.height < 24) && !isInlineLink(el));
      const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      const circleHitsRect = (c: { x: number; y: number }, r: DOMRect) => {
        const dx = c.x - Math.max(r.left, Math.min(c.x, r.right));
        const dy = c.y - Math.max(r.top, Math.min(c.y, r.bottom));
        return dx * dx + dy * dy < 12 * 12;
      };
      // Spacing exception: a 24 px circle centered on the target must not touch another target or another small target's circle.
      return undersized
        .filter(({ el, r }) => {
          const c = center(r);
          return targets.some((o) => {
            if (o.el === el || o.el.contains(el) || el.contains(o.el)) return false;
            if (circleHitsRect(c, o.r)) return true;
            const isSmall = undersized.some((u) => u.el === o.el);
            if (!isSmall) return false;
            const oc = center(o.r);
            return Math.hypot(c.x - oc.x, c.y - oc.y) < 24;
          });
        })
        .map(({ el, r }) => ({ ...window.__seuil.describe(el), w: Math.round(r.width), h: Math.round(r.height) }));
    });
    return small.map(({ w, h, ...el }) => ({
      rule: "a11y/target-size",
      severity: "error" as const,
      target: locate(target, el),
      message: `Target is ${w} x ${h} px, below 24 x 24 px, and too close to another target.`,
      references: [wcag("2.5.8")],
      suggestion: "Make the clickable area at least 24 x 24 px (padding counts), or space targets further apart.",
    }));
  },
};
