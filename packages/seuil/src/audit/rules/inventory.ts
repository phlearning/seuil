/**
 * Not a check: records what each page contains (images, fields, headings, media...)
 * plus a screenshot, as material for the guided review, and a hash that tells when
 * a reviewed page has changed.
 */
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PageInventory } from "../../results.js";
import { openTarget } from "../page.js";
import type { Rule } from "../types.js";

export const INVENTORY_RULE_ID = "seuil/inventory";

export const pageKey = (id: string, theme?: string) => [id, theme].filter(Boolean).join(" ");

export const inventoryRule: Rule = {
  id: INVENTORY_RULE_ID,
  async run(page, target, context) {
    // Material is for deployed pages; Storybook stories are covered by the pages that use them.
    if (target.kind !== "page" || !context.recordInventory) return [];
    await openTarget(page, target);
    const content = await page.evaluate(() => {
      const d = window.__seuil.describe;
      const text = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const labelOf = (el: Element) => {
        const id = el.getAttribute("id");
        const label = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest("label");
        return label ? text(label) : (el.getAttribute("aria-label") ?? "");
      };
      return {
        title: document.title,
        lang: document.documentElement.lang,
        text: document.body.innerText,
        headings: [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => ({ level: Number(h.tagName[1]), text: text(h) })),
        landmarks: [...document.querySelectorAll("header, nav, main, footer, aside, [role=banner], [role=navigation], [role=main], [role=contentinfo]")].map((l) => l.getAttribute("role") ?? l.tagName.toLowerCase()),
        images: [...document.querySelectorAll("img, svg[role=img], [role=img]")].map((img) => ({
          ...d(img),
          alt: img.getAttribute("alt") ?? img.getAttribute("aria-label"),
          src: img.getAttribute("src") ?? "",
        })),
        links: [...document.querySelectorAll("a[href]")].map((a) => ({ text: text(a), href: a.getAttribute("href") ?? "" })),
        fields: [...document.querySelectorAll("input:not([type=hidden]), select, textarea")].map((f) => ({
          ...d(f),
          type: f.getAttribute("type") ?? f.tagName.toLowerCase(),
          label: labelOf(f),
          autocomplete: f.getAttribute("autocomplete") ?? "",
          required: f.hasAttribute("required"),
        })),
        media: document.querySelectorAll("video, audio, iframe[src*='youtube'], iframe[src*='vimeo']").length,
        passwordFields: document.querySelectorAll("input[type=password]").length,
        langParts: [...document.body.querySelectorAll("[lang]")].map((el) => ({ lang: el.getAttribute("lang") ?? "", text: text(el).slice(0, 80) })),
      };
    });

    const { text, ...rest } = content;
    const hash = createHash("sha256").update(JSON.stringify(rest)).update(text).digest("hex").slice(0, 16);
    const key = pageKey(target.id, target.theme);
    let screenshot: string | undefined;
    if (context.screenshotsDir) {
      mkdirSync(context.screenshotsDir, { recursive: true });
      const file = `${key.replace(/[^a-z0-9._-]+/gi, "_")}.png`;
      await page.screenshot({ path: join(context.screenshotsDir, file), fullPage: true, animations: "disabled" });
      screenshot = file;
    }
    const inventory: PageInventory = { page: key, url: target.url, hash, ...rest, ...(screenshot && { screenshot }) };
    context.recordInventory(inventory);
    return [];
  },
};
