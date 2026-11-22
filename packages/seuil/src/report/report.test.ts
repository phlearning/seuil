import { describe, expect, it } from "vitest";
import type { Results } from "../results.js";
import { loadCriteria } from "../review/criteria.js";
import { buildReport } from "./model.js";
import { renderCsv, renderHtml, renderMarkdown } from "./render.js";

const results: Results = {
  version: 1,
  generatedAt: "2026-11-20T09:30:00.000Z",
  tool: { name: "seuil", version: "0.0.0" },
  scope: { targets: 1, rules: ["a11y/axe", "a11y/keyboard", "privacy/third-parties", "seuil/inventory"] },
  findings: [
    {
      rule: "a11y/keyboard",
      severity: "error",
      target: { kind: "page", id: "http://x/", selector: "#send" },
      message: "Keyboard focus is not visible <here>.",
      references: [{ standard: "WCAG 2.2", id: "2.4.7" }],
      suggestion: "Add a :focus-visible style | thick.",
    },
    {
      rule: "privacy/third-parties",
      severity: "error",
      target: { kind: "page", id: "http://x/", selector: "fonts.googleapis.com" },
      message: "Undeclared third party fonts.googleapis.com.",
      references: [{ standard: "nLPD (RS 235.1)", id: "art. 16" }],
    },
  ],
  dataFlows: [
    {
      target: "http://x/",
      host: "fonts.googleapis.com",
      provider: { id: "google-fonts", name: "Google Fonts", company: "Google LLC", country: "US", cloudAct: true, category: "fonts" },
      serverIp: "142.250.1.1",
      serverCountry: "US",
      resourceTypes: ["stylesheet"],
      data: ["IP address", "user agent"],
      beforeInteraction: true,
      allowed: false,
      nlpd: ["art. 16", "art. 19"],
    },
  ],
  inventory: [
    { page: "http://x/", url: "http://x/", hash: "h", title: "x", lang: "fr", headings: [], landmarks: [], images: [], links: [], fields: [], media: 0, passwordFields: 0, langParts: [] },
  ],
};

const model = (lang: "fr" | "en") => buildReport(results, loadCriteria(), { version: 1, entries: {} }, { lang, client: "Clinique des Aubépines" });

describe("report model", () => {
  it("is non-compliant when an automated failure cites a criterion, and leaves the rest to review", () => {
    const m = model("fr");
    expect(m.summary).toMatchObject({ total: 55, resolved: 1, failed: 1, verdict: "non-compliant" });
    expect(m.ech).toMatchObject({ total: 49, verdict: "non-compliant" });
    expect(m.rules).not.toContain("seuil/inventory");
  });
});

describe("renderHtml", () => {
  const html = renderHtml(model("fr"));

  it("is a French, standalone page with every criterion", () => {
    expect(html).toMatch(/^<!doctype html>\n<html lang="fr">/);
    expect(html).toContain("Clinique des Aubépines");
    expect((html.match(/<tr><th scope="row">/g) ?? []).length).toBe(55);
    expect(html).toContain("2.4.7 Visibilité du focus");
    expect(html).toContain("Non conforme (contrôle automatique)");
    expect(html).not.toMatch(/<script/);
  });

  it("escapes finding content", () => {
    expect(html).toContain("visible &lt;here&gt;.");
    expect(html).not.toContain("<here>");
  });

  it("includes the register and the DB-IP attribution", () => {
    expect(html).toContain("<td>Google LLC (US)</td>");
    expect(html).toContain("IP Geolocation by DB-IP");
  });

  it("switches language", () => {
    const en = renderHtml(model("en"));
    expect(en).toContain('<html lang="en">');
    expect(en).toContain("2.4.7 Focus Visible");
    expect(en).toContain("<strong>Error</strong>");
  });
});

describe("renderMarkdown", () => {
  it("is a PR comment with a marker, a failing icon and an escaped table", () => {
    const md = renderMarkdown(model("fr"));
    expect(md.startsWith("<!-- seuil-report -->\n## ❌ Seuil : contrôle de conformité")).toBe(true);
    expect(md).toContain("| Règle | Emplacement | Description | Correction |");
    expect(md).toContain("Add a :focus-visible style \\| thick.");
  });
});

describe("renderMarkdown grouping and escaping", () => {
  const f = (page: string, extra: Partial<Results["findings"][number]> = {}): Results["findings"][number] => ({
    rule: "privacy/third-parties",
    severity: "error",
    target: { kind: "page", id: `http://127.0.0.1:4303${page}`, selector: "www.googletagmanager.com" },
    message: "Undeclared third party www.googletagmanager.com.",
    references: [],
    suggestion: "Add a visible <label for> & remove it.",
    ...extra,
  });
  const md = (findings: Results["findings"]) =>
    renderMarkdown(buildReport({ ...results, findings }, loadCriteria(), { version: 1, entries: {} }, { lang: "fr", client: "x" }));

  it("escapes HTML so GitHub does not swallow text", () => {
    const out = md([f("/")]);
    expect(out).toContain("Add a visible &lt;label for&gt; &amp; remove it.");
    expect(out).not.toContain("<label for>");
  });

  it("groups the same finding on several pages into one row", () => {
    const out = md([f("/"), f("/plan-du-site.html"), f("/consommation.html")]);
    expect(out.match(/^\| <code>privacy\/third-parties/gm)).toHaveLength(1);
    expect(out).toContain("3 pages : /, /plan-du-site.html, /consommation.html");
  });

  it("keeps a blank line before the table and folds warnings", () => {
    const out = md([f("/"), f("/", { severity: "warning", rule: "security/deps", message: "old dep" })]);
    expect(out).toMatch(/non conforme\(s\)\.\n\n\| Règle/);
    expect(out).toContain("<details>\n<summary>Voir les 1 avertissement(s)</summary>\n\n| Règle");
  });
});

describe("renderCsv", () => {
  it("starts with a BOM and quotes cells that need it", () => {
    const csv = renderCsv(model("fr"));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [header, row] = csv.slice(1).split("\r\n");
    expect(header).toBe("Page,Hôte,Fournisseur,Société (pays),Serveur,Au chargement,Déclaré,nLPD,IP,Types,Données,CLOUD Act");
    expect(row).toBe('http://x/,fonts.googleapis.com,Google Fonts,Google LLC (US),US,oui,non,"art. 16, art. 19",142.250.1.1,stylesheet,IP address / user agent,oui');
  });
});
