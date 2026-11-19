import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, page, type Harness } from "../testing.js";
import { axeRule } from "./axe.js";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

describe("a11y/axe", () => {
  it("passes a clean page", async () => {
    expect(await h.run(axeRule, page(`<h1>Bonjour</h1><label for="n">Nom</label><input id="n">`))).toEqual([]);
  });

  it("flags an input without a label, with selector, snippet and WCAG references", async () => {
    const [finding] = await h.run(axeRule, page(`<h1>Bonjour</h1><input id="anon">`));
    expect(finding).toMatchObject({
      rule: "a11y/axe",
      severity: "error",
      target: { kind: "page", selector: "#anon" },
    });
    expect(finding?.target.snippet).toContain("<input");
    const ids = finding?.references.map((r) => `${r.standard} ${r.id}`);
    expect(ids).toContain("axe-core label");
    expect(ids?.some((id) => id.startsWith("WCAG 2.2"))).toBe(true);
  });

  it("flags a missing page language against 3.1.1", async () => {
    const findings = await h.run(axeRule, `<!doctype html><html><head><title>x</title></head><body><main><h1>x</h1></main></body></html>`);
    expect(findings.flatMap((f) => f.references.map((r) => r.id))).toContain("3.1.1");
  });
});
