import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, page, type Harness } from "../testing.js";
import { labelsRule } from "./labels.js";

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(() => h.close());

describe("a11y/labels", () => {
  it("accepts label for, wrapping label, aria-label and aria-labelledby", async () => {
    const html = page(`
      <label for="a">Nom</label><input id="a">
      <label>E-mail <input type="email"></label>
      <input aria-label="Recherche">
      <span id="t">Motif</span><select aria-labelledby="t"><option>x</option></select>
      <input type="hidden" name="token"><button>Envoyer</button>`);
    expect(await h.run(labelsRule, html)).toEqual([]);
  });

  it("flags a field named only by its placeholder (3.3.2)", async () => {
    const [finding, ...rest] = await h.run(labelsRule, page(`<input name="allergies" placeholder="Allergies connues">`));
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({ rule: "a11y/labels", severity: "error" });
    expect(finding?.message).toContain('"Allergies connues"');
    expect(finding?.references.map((r) => r.id)).toEqual(["3.3.2", "1.3.1"]);
  });

  it("flags a textarea with no name at all", async () => {
    const findings = await h.run(labelsRule, page(`<textarea></textarea>`));
    expect(findings[0]?.message).toBe("Field without any label.");
  });
});
