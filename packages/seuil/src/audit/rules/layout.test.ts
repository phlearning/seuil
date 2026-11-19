import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, page, type Harness } from "../testing.js";
import { motionRule, reflowRule, targetSizeRule, textSpacingRule } from "./layout.js";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

const criteria = (findings: { references: { id: string }[] }[]) => [...new Set(findings.flatMap((f) => f.references.map((r) => r.id)))];

describe("a11y/reflow", () => {
  it("passes fluid content", async () => {
    expect(await h.run(reflowRule, page(`<p>Un texte qui passe à la ligne sans problème sur un petit écran.</p>`))).toEqual([]);
  });

  it("flags a fixed-width block at 320 px (1.4.10)", async () => {
    const findings = await h.run(reflowRule, page(`<div id="wide" style="width:600px">Bloc large</div>`));
    expect(criteria(findings)).toEqual(["1.4.10"]);
    expect(findings[0]).toMatchObject({ severity: "error", target: { selector: "#wide" } });
  });

  it("only warns for a wide table, which may need two dimensions", async () => {
    const findings = await h.run(reflowRule, page(`<table style="width:700px"><tr><td>a</td><td>b</td></tr></table>`));
    expect(findings.every((f) => f.severity === "warning")).toBe(true);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("flags text cut off at 200% (1.4.4)", async () => {
    const text = "Votre demande a bien été enregistrée et sera traitée dans les meilleurs délais par nos services.";
    const findings = await h.run(reflowRule, page(`<p id="box" style="height:24px;overflow:hidden;width:50%">${text}</p>`));
    expect(criteria(findings)).toContain("1.4.4");
  });
});

describe("a11y/text-spacing", () => {
  it("passes text that can grow", async () => {
    expect(await h.run(textSpacingRule, page(`<p>Texte libre de s'agrandir.</p>`))).toEqual([]);
  });

  it("flags a fixed-height label that clips with wider spacing (1.4.12)", async () => {
    const findings = await h.run(
      textSpacingRule,
      // Fits on one line at line-height 1, overflows once line-height becomes 1.5.
      page(`<button id="btn" style="height:22px;width:220px;overflow:hidden;line-height:1;font-size:16px">Prendre rendez-vous</button>`),
    );
    expect(criteria(findings)).toEqual(["1.4.12"]);
    expect(findings[0]?.target.selector).toBe("#btn");
  });
});

describe("a11y/motion", () => {
  const spinner = `@keyframes spin { to { transform: rotate(360deg) } } #spin { width: 20px; height: 20px; background: #000; animation: spin 1s linear infinite; }`;

  it("passes an animation that respects prefers-reduced-motion", async () => {
    const css = `@media (prefers-reduced-motion: no-preference) { ${spinner} }`;
    expect(await h.run(motionRule, page(`<div id="spin"></div>`, `<style>${css}</style>`))).toEqual([]);
  });

  it("warns about an endless animation that ignores it (2.2.2)", async () => {
    const findings = await h.run(motionRule, page(`<div id="spin"></div>`, `<style>${spinner}</style>`));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "warning", target: { selector: "#spin" } });
    expect(criteria(findings)).toEqual(["2.2.2", "2.3.3"]);
  });
});

describe("a11y/target-size", () => {
  it("passes 24 px targets", async () => {
    expect(await h.run(targetSizeRule, page(`<button style="width:24px;height:24px;padding:0">x</button>`))).toEqual([]);
  });

  it("passes a small target with enough space around it", async () => {
    expect(await h.run(targetSizeRule, page(`<button style="width:16px;height:16px;padding:0">x</button>`))).toEqual([]);
  });

  it("ignores links inside a sentence", async () => {
    expect(await h.run(targetSizeRule, page(`<p>Consultez <a href="#c">les conditions</a> avant de valider votre demande en ligne.</p>`))).toEqual([]);
  });

  it("flags small targets packed together (2.5.8)", async () => {
    const findings = await h.run(
      targetSizeRule,
      page(`<div style="display:flex"><button id="a" style="width:16px;height:16px;padding:0;margin:0">a</button><button id="b" style="width:16px;height:16px;padding:0;margin:0">b</button></div>`),
    );
    expect(findings.map((f) => f.target.selector).sort()).toEqual(["#a", "#b"]);
    expect(criteria(findings)).toEqual(["2.5.8"]);
  });
});
