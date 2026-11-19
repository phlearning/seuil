import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, page, type Harness } from "../testing.js";
import { analyzeCsp, headersRule, parseCsp } from "./headers.js";

const GOOD = {
  "content-security-policy": "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

describe("parseCsp and analyzeCsp", () => {
  const issues = (csp: string) => analyzeCsp(parseCsp(csp)).map((i) => `${i.severity}: ${i.message}`);

  it("accepts a strict policy", () => {
    expect(issues(GOOD["content-security-policy"])).toEqual([]);
  });

  it("keeps the first occurrence of a directive", () => {
    expect(parseCsp("script-src 'self'; script-src *").get("script-src")).toEqual(["'self'"]);
  });

  it("rejects unsafe-inline without a nonce, accepts it with one", () => {
    expect(issues("default-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'")).toEqual([
      "error: default-src allows 'unsafe-inline': an injected <script> would run.",
    ]);
    expect(issues("default-src 'self'; script-src 'self' 'unsafe-inline' 'nonce-abc'; object-src 'none'; base-uri 'self'")).toEqual([]);
  });

  it("rejects unsafe-eval and wide sources", () => {
    const found = issues("script-src 'self' 'unsafe-eval' https:; object-src 'none'; base-uri 'self'");
    expect(found).toHaveLength(2);
    expect(found.join("\n")).toContain("https:");
  });

  it("flags a policy that does not restrict scripts", () => {
    expect(issues("img-src 'self'; object-src 'none'; base-uri 'self'")[0]).toMatch(/^error: CSP sets neither/);
  });

  it("warns about missing object-src and base-uri", () => {
    expect(issues("default-src 'self'")).toEqual([
      "warning: CSP does not set object-src 'none'.",
      "warning: CSP does not set base-uri: an injected <base> could redirect relative URLs.",
    ]);
  });
});

describe("security/headers on a served page", () => {
  let good: Harness;
  let bare: Harness;
  beforeAll(async () => {
    [good, bare] = await Promise.all([createHarness({ headers: GOOD }), createHarness()]);
  });
  afterAll(() => Promise.all([good.close(), bare.close()]));

  it("passes a page with sound headers (HSTS is not expected over plain HTTP)", async () => {
    expect(await good.run(headersRule, page(`<h1>ok</h1>`))).toEqual([]);
  });

  it("lets the other rules run under a strict CSP", async () => {
    const { textSpacingRule } = await import("./layout.js");
    const { keyboardRule } = await import("./keyboard.js");
    expect(await good.run(keyboardRule, page(`<button>Un</button>`))).toEqual([]);
    expect(await good.run(textSpacingRule, page(`<p>Texte</p>`))).toEqual([]);
  });

  it("blocks a page without CSP and warns about the rest", async () => {
    const findings = await bare.run(headersRule, page(`<h1>nu</h1>`));
    const summary = findings.map((f) => `${f.severity} ${f.target.selector}`);
    expect(summary).toEqual([
      "error content-security-policy",
      "warning x-content-type-options",
      "warning referrer-policy",
      "warning permissions-policy",
    ]);
    expect(findings[0]?.references.map((r) => r.id)).toContain("art. 8");
  });
});
