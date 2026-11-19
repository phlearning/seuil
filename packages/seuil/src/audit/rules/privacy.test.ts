import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Provider } from "../../privacy/providers.js";
import { createHarness, page, type Harness } from "../testing.js";
import { consentRule, thirdPartiesRule } from "./privacy.js";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
  h.write("widget.js", "window.widgetLoaded = true;");
});
afterAll(() => h.close());
beforeEach(() => {
  h.flows.length = 0;
});

// "localhost" plays the third party; this fake provider lets the tests exercise provider matching offline.
const fakeTracker: Provider = {
  id: "fake-analytics",
  name: "Fake Analytics",
  company: "Fake Corp",
  country: "US",
  cloudAct: true,
  category: "analytics",
  domains: ["localhost"],
  source: "https://example.org/privacy",
};

const withWidget = () => page(`<h1>Accueil</h1>`, `<script src="${h.thirdParty}/widget.js"></script>`);

describe("privacy/third-parties", () => {
  it("passes a page without third parties and records no flow", async () => {
    expect(await h.run(thirdPartiesRule, page(`<h1>Accueil</h1>`))).toEqual([]);
    expect(h.flows).toEqual([]);
  });

  it("blocks an undeclared third party and records the flow", async () => {
    const [finding] = await h.run(thirdPartiesRule, withWidget());
    expect(finding).toMatchObject({ rule: "privacy/third-parties", severity: "error", target: { selector: "localhost" } });
    expect(finding?.message).toContain("Undeclared third party localhost");
    expect(finding?.references.map((r) => r.id)).toEqual(["art. 19"]);
    expect(h.flows).toMatchObject([{ host: "localhost", serverCountry: "local", allowed: false, resourceTypes: ["script"], beforeInteraction: true }]);
  });

  it("accepts a declared third party but still lists it in the register", async () => {
    expect(await h.run(thirdPartiesRule, withWidget(), { allowThirdParties: ["localhost"] })).toEqual([]);
    expect(h.flows).toMatchObject([{ host: "localhost", allowed: true }]);
  });

  it("names a known provider and cites art. 16 when it is abroad", async () => {
    const [finding] = await h.run(thirdPartiesRule, withWidget(), { providers: [fakeTracker] });
    expect(finding?.message).toContain("Fake Analytics (Fake Corp, US, US CLOUD Act)");
    expect(finding?.references.map((r) => r.id)).toEqual(["art. 16", "art. 19"]);
    expect(h.flows[0]?.provider?.id).toBe("fake-analytics");
  });

  it("can be declared by provider id", async () => {
    expect(await h.run(thirdPartiesRule, withWidget(), { providers: [fakeTracker], allowThirdParties: ["fake-analytics"] })).toEqual([]);
  });
});

describe("privacy/consent", () => {
  it("passes a page that sets no tracking cookie and loads no tracker", async () => {
    expect(await h.run(consentRule, page(`<h1>Accueil</h1>`, `<script>document.cookie = "lang=fr; path=/";</script>`))).toEqual([]);
  });

  it("flags a tracker loaded before any choice, even when declared", async () => {
    const findings = await h.run(consentRule, withWidget(), { providers: [fakeTracker], allowThirdParties: ["fake-analytics"] });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Fake Analytics (analytics) is contacted on page load");
  });

  it("flags a tracking cookie set on load", async () => {
    const [finding] = await h.run(consentRule, page(`<h1>Accueil</h1>`, `<script>document.cookie = "_ga=GA1.1.123.456; path=/";</script>`));
    expect(finding).toMatchObject({ rule: "privacy/consent", severity: "error", target: { selector: "cookie _ga" } });
  });
});
