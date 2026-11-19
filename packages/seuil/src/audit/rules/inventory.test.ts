import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PageInventory } from "../../results.js";
import { createHarness, page, type Harness } from "../testing.js";
import { inventoryRule } from "./inventory.js";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

async function inventoryOf(html: string, screenshotsDir?: string): Promise<PageInventory> {
  const found: PageInventory[] = [];
  await h.run(inventoryRule, html, { recordInventory: (i) => found.push(i), ...(screenshotsDir && { screenshotsDir }) });
  expect(found).toHaveLength(1);
  return found[0]!;
}

describe("seuil/inventory", () => {
  const html = page(
    `<h1>Rendez-vous</h1><img src="logo.png" alt="Clinique des Aubépines"><img src="deco.png" alt="">
     <label for="n">Nom</label><input id="n" autocomplete="name" required>
     <a href="/aide">Aide</a><p lang="de">Willkommen</p>`,
  );

  it("records the material a reviewer needs", async () => {
    const inv = await inventoryOf(html);
    expect(inv).toMatchObject({
      title: "Fixture",
      lang: "fr",
      headings: [{ level: 1, text: "Rendez-vous" }],
      landmarks: ["main"],
      links: [{ text: "Aide", href: "/aide" }],
      fields: [{ selector: "#n", label: "Nom", autocomplete: "name", required: true, type: "input" }],
      media: 0,
      passwordFields: 0,
      langParts: [{ lang: "de", text: "Willkommen" }],
    });
    expect(inv.images.map((i) => i.alt)).toEqual(["Clinique des Aubépines", ""]);
  });

  it("keeps the same hash for the same page and changes it when the content changes", async () => {
    const a = await inventoryOf(html);
    const b = await inventoryOf(html);
    const c = await inventoryOf(html.replace("Rendez-vous", "Rendez-vous en ligne"));
    expect(a.hash).toBe(b.hash);
    expect(c.hash).not.toBe(a.hash);
  });

  it("saves a full-page screenshot when asked", async () => {
    const dir = mkdtempSync(join(tmpdir(), "seuil-screens-"));
    const inv = await inventoryOf(html, dir);
    expect(inv.screenshot).toMatch(/\.png$/);
    expect(existsSync(join(dir, inv.screenshot!))).toBe(true);
  });
});
