import { describe, expect, it } from "vitest";
import { exitCode, type Finding, type Results } from "./results.js";

const finding = (severity: Finding["severity"]): Finding => ({
  rule: "tokens/contrast",
  severity,
  target: { kind: "token", id: "color.text.muted" },
  message: "Contrast ratio 3.2:1 is below 4.5:1",
  references: [{ standard: "WCAG 2.2", id: "1.4.3" }],
});

const results = (...findings: Finding[]): Results => ({
  version: 1,
  generatedAt: "2026-11-19T00:00:00.000Z",
  findings,
});

describe("exitCode", () => {
  it("passes when there are no findings", () => {
    expect(exitCode(results())).toBe(0);
  });

  it("fails on an error", () => {
    expect(exitCode(results(finding("error")))).toBe(1);
  });

  it("ignores warnings by default", () => {
    expect(exitCode(results(finding("warning")))).toBe(0);
  });

  it("fails on warnings when failOn is warning", () => {
    expect(exitCode(results(finding("warning")), "warning")).toBe(1);
  });

  it("returns 2 when some checks could not run, even without findings", () => {
    expect(exitCode({ ...results(), errors: ["a11y/axe on home: timeout"] })).toBe(2);
  });
});
