import { describe, expect, it } from "vitest";
import { ConfigError, parseConfig } from "./config.js";

describe("parseConfig", () => {
  it("fills defaults", () => {
    expect(parseConfig({}, "/repo")).toMatchObject({ failOn: "error", level: "AA", targets: [], offline: false });
  });

  it("resolves the tokens path against the config directory", () => {
    const config = parseConfig({ tokens: { path: "packages/tokens/src", pairs: [["a", "b"]] } }, "/repo");
    expect(config.tokens).toEqual({ path: "/repo/packages/tokens/src", themes: [], pairs: [["a", "b"]] });
  });

  it("accepts pairs with a kind", () => {
    const config = parseConfig({ tokens: { path: ".", pairs: [{ fg: "a", bg: "b", kind: "ui" }] } }, "/repo");
    expect(config.tokens?.pairs).toEqual([{ fg: "a", bg: "b", kind: "ui" }]);
  });

  it("rejects a malformed pair with its index", () => {
    expect(() => parseConfig({ tokens: { path: ".", pairs: [["a", "b"], ["a"]] } }, "/repo")).toThrow(/pairs\[1\]/);
  });

  it("rejects an unknown kind", () => {
    expect(() => parseConfig({ tokens: { path: ".", pairs: [{ fg: "a", bg: "b", kind: "huge" }] } }, "/repo")).toThrow(ConfigError);
  });

  it("rejects a bad failOn", () => {
    expect(() => parseConfig({ failOn: "never" }, "/repo")).toThrow(/failOn/);
  });
});
