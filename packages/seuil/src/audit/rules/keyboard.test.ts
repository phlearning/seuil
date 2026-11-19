import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, page, type Harness } from "../testing.js";
import { keyboardRule } from "./keyboard.js";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

const criteria = (findings: { references: { id: string }[] }[]) => findings.flatMap((f) => f.references.map((r) => r.id));

describe("a11y/keyboard", () => {
  it("passes buttons with the default focus ring", async () => {
    expect(await h.run(keyboardRule, page(`<button>Un</button> <button>Deux</button> <a href="#x">Lien</a>`))).toEqual([]);
  });

  it("flags a control whose focus leaves no visible trace (2.4.7)", async () => {
    const findings = await h.run(keyboardRule, page(`<button id="ghost">Invisible</button>`, `<style>#ghost:focus{outline:none}</style>`));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "error", target: { selector: "#ghost" } });
    expect(criteria(findings)).toEqual(["2.4.7"]);
  });

  it("flags a keyboard trap (2.1.2)", async () => {
    const html = page(
      `<button>Avant</button><input id="trap" aria-label="Piège"><button id="after">Après</button>`,
      `<script>addEventListener("DOMContentLoaded", () => {
         const t = document.getElementById("trap");
         t.addEventListener("keydown", (e) => { if (e.key === "Tab") e.preventDefault(); });
       });</script>`,
    );
    const findings = await h.run(keyboardRule, html);
    expect(criteria(findings)).toContain("2.1.2");
    expect(findings.find((f) => f.references[0]?.id === "2.1.2")?.target.selector).toBe("#trap");
  });

  it("reports one trap, not a list of unreachable elements, when focus is held from the start", async () => {
    const html = page(
      `<div id="popup"><p>Info</p><button id="ok">J'ai compris</button></div><a href="#a">Accueil</a><button>Envoyer</button>`,
      `<script>addEventListener("DOMContentLoaded", () => {
         const ok = document.getElementById("ok");
         document.addEventListener("keydown", (e) => { if (e.key === "Tab") { e.preventDefault(); ok.focus(); } });
       });</script>`,
    );
    const findings = await h.run(keyboardRule, html);
    expect(findings.map((f) => `${f.references[0]?.id} ${f.target.selector}`)).toEqual(["2.1.2 #ok"]);
  });

  it("flags a custom button that cannot be reached by keyboard (2.1.1)", async () => {
    const findings = await h.run(keyboardRule, page(`<button>Ok</button><div role="button" id="fake">Valider</div>`));
    expect(criteria(findings)).toEqual(["2.1.1"]);
    expect(findings[0]?.target.selector).toBe("#fake");
  });

  it("treats a radio group as one tab stop (arrows move inside it)", async () => {
    const html = page(`<fieldset><legend>Verdict</legend>
      <label><input type="radio" name="v" value="ok"> Conforme</label>
      <label><input type="radio" name="v" value="ko"> Non conforme</label>
      <label><input type="radio" name="v" value="na"> Non applicable</label></fieldset><button>Enregistrer</button>`);
    expect(await h.run(keyboardRule, html)).toEqual([]);
  });

  it("accepts a heading with tabindex=-1 as a programmatic focus target", async () => {
    expect(await h.run(keyboardRule, page(`<h2 tabindex="-1" id="t">Titre</h2><button>Ok</button>`))).toEqual([]);
  });

  it("still flags a native button removed from the tab order", async () => {
    const findings = await h.run(keyboardRule, page(`<button>Ok</button><button tabindex="-1" id="hidden">Envoyer</button>`));
    expect(findings.map((f) => f.target.selector)).toEqual(["#hidden"]);
  });

  it("warns about a positive tabindex (2.4.3)", async () => {
    const findings = await h.run(keyboardRule, page(`<button>Un</button><button tabindex="3" id="jump">Deux</button>`));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "warning", target: { selector: "#jump" } });
    expect(criteria(findings)).toEqual(["2.4.3"]);
  });

  it("flags a focused element entirely hidden under a sticky header (2.4.11)", async () => {
    const html = page(
      `<div style="height:1200px"></div><button id="under">Caché</button><div style="height:1200px"></div>`,
      `<style>
        body { margin: 0 }
        .bar { position: fixed; inset: 0 0 auto 0; height: 100vh; background: #fff; }
      </style>`,
    ).replace("<main>", `<div class="bar">Bandeau</div><main>`);
    const findings = await h.run(keyboardRule, html);
    expect(criteria(findings)).toContain("2.4.11");
  });

  it("stays inside an open modal dialog without calling it a trap", async () => {
    const html = page(
      `<button>Fond</button><dialog id="d"><button>Confirmer</button><button>Fermer</button></dialog>`,
      `<script>addEventListener("DOMContentLoaded", () => document.getElementById("d").showModal());</script>`,
    );
    expect(await h.run(keyboardRule, html)).toEqual([]);
  });
});
