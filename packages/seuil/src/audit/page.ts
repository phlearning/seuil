import type { Page, Response } from "playwright";
import type { AuditTarget } from "./types.js";

export interface Described {
  selector: string;
  snippet: string;
}

declare global {
  interface Window {
    __seuil: {
      isVisible(el: Element): boolean;
      tabbables(): Element[];
      interactive(): Element[];
      describe(el: Element): Described;
      clipped(root?: Element | null): Described[];
    };
    __seuilLast?: HTMLElement | null;
  }
}

/**
 * Helpers injected into the page as plain JavaScript (a string, so no bundler
 * helper ever leaks into the browser). Exposed as window.__seuil.
 */
const HELPERS = String.raw`
(() => {
  const INTERACTIVE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable="true"], [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], [role="slider"]';

  const cssPath = (el) => {
    if (!(el instanceof Element)) return "";
    if (el.id && document.querySelectorAll("#" + CSS.escape(el.id)).length === 1) return "#" + CSS.escape(el.id);
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && node !== document.documentElement) {
      if (node.id && document.querySelectorAll("#" + CSS.escape(node.id)).length === 1) {
        parts.unshift("#" + CSS.escape(node.id));
        return parts.join(" > ");
      }
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      const same = parent ? [...parent.children].filter((c) => c.tagName === node.tagName) : [];
      parts.unshift(same.length > 1 ? tag + ":nth-of-type(" + (same.indexOf(node) + 1) + ")" : tag);
      node = parent;
    }
    return parts.join(" > ");
  };

  const snippet = (el) => {
    const html = el.outerHTML || "";
    return html.length > 240 ? html.slice(0, 240) + "..." : html;
  };

  const isVisible = (el) => {
    if (typeof el.checkVisibility === "function" && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const modalScope = () => document.querySelector("dialog:modal") || document;

  const tabbables = () =>
    [...modalScope().querySelectorAll(INTERACTIVE)].filter(
      (el) => el.tabIndex >= 0 && !el.disabled && !el.closest("[inert]") && isVisible(el),
    );

  const interactive = () =>
    [...modalScope().querySelectorAll(INTERACTIVE)].filter((el) => !el.disabled && !el.closest("[inert]") && isVisible(el));

  const describe = (el) => ({ selector: cssPath(el), snippet: snippet(el) });

  /** Elements whose text is cut off: overflow hidden or clip, with more content than room. */
  const clipped = (root) => {
    const out = [];
    for (const el of (root || document.body).querySelectorAll("*")) {
      if (!isVisible(el) || !el.textContent || !el.textContent.trim()) continue;
      const s = getComputedStyle(el);
      const hidesX = /hidden|clip/.test(s.overflowX);
      const hidesY = /hidden|clip/.test(s.overflowY);
      if ((hidesX && el.scrollWidth > el.clientWidth + 1) || (hidesY && el.scrollHeight > el.clientHeight + 1)) out.push(describe(el));
    }
    return out;
  };

  window.__seuil = { cssPath, snippet, isVisible, tabbables, interactive, describe, clipped };
})();
`;

export interface OpenOptions {
  viewport?: { width: number; height: number };
  reducedMotion?: "reduce" | "no-preference";
}

export const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

/** Loads a target in a known state and installs the helpers. Returns the main document's response. */
export async function openTarget(page: Page, target: AuditTarget, options: OpenOptions = {}): Promise<Response | null> {
  await page.setViewportSize(options.viewport ?? DEFAULT_VIEWPORT);
  await page.emulateMedia({ reducedMotion: options.reducedMotion ?? "no-preference" });
  const response = await page.goto(target.url, { waitUntil: "load" });
  if (target.root) await page.waitForSelector(`${target.root} > *`, { state: "attached", timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // evaluate, not addScriptTag: a strict CSP would block an inline script tag, and the
  // audit must run with the page's real CSP enforced.
  await page.evaluate(HELPERS);
  return response;
}

export function locate(target: AuditTarget, element?: Described) {
  return {
    kind: target.kind,
    id: target.id,
    ...(target.theme && { theme: target.theme }),
    ...(element && { selector: element.selector, snippet: element.snippet }),
  };
}
